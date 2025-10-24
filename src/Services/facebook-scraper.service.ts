import { Injectable, Logger } from '@nestjs/common';
import * as puppeteer from 'puppeteer';
import { FacebookCookie } from '../entities/facebook-cookie.entity';
import { AdminService } from '../modules/admin/admin.service';
import { decrypt } from '../utils/crypto.util';

@Injectable()
export class FacebookScraperService {
  private readonly logger = new Logger(FacebookScraperService.name);

  constructor(private adminService: AdminService) {}

  private async getStoredCookies(): Promise<any[] | null> {
    const record = await this.adminService.getLatestCookie();
    if (!record) return null;
    
    try {
      const json = decrypt(record.encrypted);
      const cookies = JSON.parse(json);
      return cookies;
    } catch (e) {
      this.logger.error('Error desencriptando cookie', e);
      return null;
    }
  }

  public async validateCookie(): Promise<{ ok: boolean; reason?: string; detail?: string }> {
    const cookies = await this.getStoredCookies();
    if (!cookies) return { ok: false, reason: 'no_cookie' };

    let browser: puppeteer.Browser | null = null;
    try {
      browser = await puppeteer.launch({ 
        headless: true, 
        args: ['--no-sandbox', '--disable-setuid-sandbox'] 
      });
      
      const page = await browser.newPage();
      await page.setCookie(...cookies);
      await page.goto('https://m.facebook.com/', { 
        waitUntil: 'networkidle2', 
        timeout: 20000 
      });
      
      const logged = await page.evaluate(() => {
        return !!document.querySelector('[aria-label="Cuenta"]') || 
               !!document.querySelector('a[href*="/profile.php"]') || 
               !!document.querySelector('[data-click="profile_icon"]') ||
               !!document.querySelector('[aria-label="Account"]');
      });
      
      if (!logged) {
        return { ok: false, reason: 'not_logged' };
      }
      
      return { ok: true };
    } catch (err) {
      this.logger.warn('validateCookie error', err.message);
      return { ok: false, reason: 'error', detail: err.message };
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  public async extractVideoUrlFromFacebook(
    pageUrl: string
  ): Promise<{ success: boolean; videoUrl?: string; audioUrl?: string; error?: string; candidates?: string[] }> {
    const cookies = await this.getStoredCookies();
    if (!cookies) return { success: false, error: 'No cookie stored' };

    let browser: puppeteer.Browser | null = null;
    try {
      browser = await puppeteer.launch({ 
        headless: true, 
        args: ['--no-sandbox', '--disable-setuid-sandbox'] 
      });
      
      const page = await browser.newPage();
      
      const videoUrls: string[] = [];
      const audioUrls: string[] = [];
      await page.setRequestInterception(true);
      page.on('request', (request) => {
        const url = request.url();
        if (url.includes('.mp4') && url.includes('fbcdn.net')) {
          if (url.includes('/m412/') || url.includes('heaac') || url.includes('_audio')) {
            audioUrls.push(url);
          } else {
            videoUrls.push(url);
          }
        }
        if (url.includes('.m4a') && url.includes('fbcdn.net')) {
          audioUrls.push(url);
        }
        request.continue();
      });

      await page.setCookie(...cookies);
      await page.goto(pageUrl, { waitUntil: 'networkidle2', timeout: 30000 });

      await new Promise(resolve => setTimeout(resolve, 5000));

      try {
        const videoElement = await page.$('video');
        if (videoElement) {
          await videoElement.click();
          this.logger.log('Clicked video element, waiting for audio to load...');
          await new Promise(resolve => setTimeout(resolve, 5000));
          this.logger.log(`After click - Video URLs: ${videoUrls.length}, Audio URLs: ${audioUrls.length}`);
        }
      } catch (e) {
        this.logger.warn('Could not click video element');
      }

      const videoSrc = await page.evaluate(() => {
        const v = document.querySelector('video');
        if (!v) return null;
        
        if ((v as HTMLVideoElement).currentSrc) {
          return (v as HTMLVideoElement).currentSrc;
        }
        
        if ((v as HTMLVideoElement).src) {
          return (v as HTMLVideoElement).src;
        }
        
        const sources = v.querySelectorAll('source');
        for (const source of Array.from(sources)) {
          if (source.src) return source.src;
        }
        
        return null;
      });

      if (videoSrc && !videoSrc.includes('m3u8')) {
        const cleanUrl = this.removeRangeParams(videoSrc);
        this.logger.log(`Found video src from element: ${cleanUrl}`);
        
        this.logger.log(`Checking ${audioUrls.length} audio URLs for this strategy`);
        let audioUrl: string | undefined;
        if (audioUrls.length > 0) {
          this.logger.log('Audio URLs in strategy 1:', audioUrls);
          audioUrl = this.removeRangeParams(audioUrls[0]);
          this.logger.log(`Found audio URL: ${audioUrl}`);
        }
        
        return { success: true, videoUrl: cleanUrl, audioUrl };
      }

      if (videoUrls.length > 0) {
        this.logger.log(`Found ${videoUrls.length} video URLs intercepted`);
        this.logger.log(`Found ${audioUrls.length} audio URLs intercepted`);
        
        const mp4Urls = videoUrls.filter(url => url.includes('.mp4') && !url.includes('m3u8'));
        this.logger.log(`Filtered to ${mp4Urls.length} MP4 URLs`);
        
        this.logger.log('All intercepted URLs (first 20):', videoUrls.slice(0, 20));
        this.logger.log('Audio URLs intercepted:', audioUrls);
        
        if (mp4Urls.length > 0) {
          const cleanUrl = this.removeRangeParams(mp4Urls[0]);
          
          let audioUrl: string | undefined;
          if (audioUrls.length > 0) {
            const cleanAudioUrl = this.removeRangeParams(audioUrls[0]);
            audioUrl = cleanAudioUrl;
            this.logger.log(`Using audio URL: ${audioUrl}`);
          }
          
          return { success: true, videoUrl: cleanUrl, audioUrl, candidates: mp4Urls };
        }
      }

      const html = await page.content();
      
      const videoRe = /https?:\/\/[^"'\s]+\.fbcdn\.net\/[^"'\s]+\.mp4/g;
      const videoMatches = html.match(videoRe);
      if (videoMatches && videoMatches.length > 0) {
        const cleanUrl = this.removeRangeParams(videoMatches[0]);
        
        const audioPatterns = [
          /https?:\/\/[^"'\s]+\.fbcdn\.net\/[^"'\s]+\.m4a/g,
          /https?:\/\/[^"'\s]+scontent[^"'\s]+\.m4a/g,
          /"audio_url":"([^"]+)"/g,
          /"dash_audio_mp4":"([^"]+)"/g,
        ];
        
        let audioUrl: string | undefined;
        for (const pattern of audioPatterns) {
          const audioMatches = html.match(pattern);
          if (audioMatches && audioMatches.length > 0) {
            audioUrl = this.removeRangeParams(audioMatches[0]);
            break;
          }
        }
        
        return { success: true, videoUrl: cleanUrl, audioUrl, candidates: videoMatches };
      }

      const jsonPatterns = [
        /"playable_url":"([^"]+)"/g,
        /"video_url":"([^"]+)"/g,
        /"hd_src":"([^"]+)"/g,
        /"sd_src":"([^"]+)"/g,
        /"video_url\\u00253A":"([^"]+)"/g,
      ];

      let foundVideoUrl: string | null = null;
      let foundAudioUrl: string | undefined;

      for (const pattern of jsonPatterns) {
        const matches: string[] = [];
        let m;
        while ((m = pattern.exec(html)) !== null) {
          const url = m[1].replace(/\\/g, '');
          if (url.includes('.mp4') || url.includes('fbcdn.net')) {
            matches.push(url);
          }
        }
        if (matches.length > 0) {
          foundVideoUrl = this.removeRangeParams(matches[0]);
        }
      }

      const audioJsonPatterns = [
        /"audio_url":"([^"]+)"/g,
        /"dash_audio_mp4":"([^"]+)"/g,
        /"audio_stream":"([^"]+)"/g,
        /"audio_url\\u00253A":"([^"]+)"/g,
      ];

      for (const pattern of audioJsonPatterns) {
        const matches: string[] = [];
        let m;
        while ((m = pattern.exec(html)) !== null) {
          const url = m[1].replace(/\\/g, '');
          if (url.includes('.m4a') || url.includes('fbcdn.net')) {
            matches.push(url);
          }
        }
        if (matches.length > 0) {
          foundAudioUrl = this.removeRangeParams(matches[0]);
          break;
        }
      }

      if (foundVideoUrl) {
        return { success: true, videoUrl: foundVideoUrl, audioUrl: foundAudioUrl };
      }

      const windowData = await page.evaluate(() => {
        return (window as any).__d || (window as any).__REACT_HOT_LOADER__ || '';
      });

      if (windowData) {
        const dataStr = JSON.stringify(windowData);
        const dataMatches = dataStr.match(/https?:\/\/[^"'\s]+\.fbcdn\.net\/[^"'\s]+\.mp4/g);
        if (dataMatches && dataMatches.length > 0) {
          const cleanUrl = this.removeRangeParams(dataMatches[0]);
          return { success: true, videoUrl: cleanUrl, candidates: dataMatches };
        }
      }

      this.logger.warn('Failed to find video URL', { 
        pageUrl, 
        totalVideoUrls: videoUrls.length,
        totalAudioUrls: audioUrls.length,
        htmlLength: html.length 
      });
      
      if (videoUrls.length > 0) {
        this.logger.log('Video URLs intercepted (first 5):', videoUrls.slice(0, 5));
      }
      if (audioUrls.length > 0) {
        this.logger.log('Audio URLs intercepted (first 5):', audioUrls.slice(0, 5));
      } else {
        this.logger.warn('NO AUDIO URLs intercepted - this video might not have separate audio track');
      }
      
      return { success: false, error: 'No video URL found' };
    } catch (err) {
      this.logger.error('Error extracting video', err);
      return { success: false, error: err.message };
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  private removeRangeParams(url: string): string {
    try {
      const urlObj = new URL(url);
      urlObj.searchParams.delete('bytestart');
      urlObj.searchParams.delete('byteend');
      return urlObj.toString();
    } catch (e) {
      return url.replace(/[&?]bytestart=\d+/g, '').replace(/[&?]byteend=\d+/g, '');
    }
  }

  public async markCookieAsInvalid(): Promise<void> {
    await this.adminService.markCookieAsInvalid();
  }
}

