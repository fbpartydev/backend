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
  ): Promise<{ success: boolean; videoUrl?: string; audioUrl?: string; title?: string; error?: string; candidates?: string[] }> {
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
        if ((url.includes('.mp4') || url.includes('.m4a')) && url.includes('fbcdn.net')) {
          const efgMatch = url.match(/efg=([^&]+)/);
          let isAudio = false;
          
          if (efgMatch) {
            try {
              const urlDecoded = decodeURIComponent(efgMatch[1]);
              const base64Decoded = Buffer.from(urlDecoded, 'base64').toString('utf-8');
              if (base64Decoded.includes('audio') || base64Decoded.includes('heaac')) {
                isAudio = true;
              }
            } catch (e) {}
          }
          
          if (!isAudio && (url.includes('/m412/') || url.includes('/m4a'))) {
            isAudio = true;
          }
          
          if (isAudio) {
            if (!audioUrls.includes(url)) {
              audioUrls.push(url);
            }
          } else {
            if (!videoUrls.includes(url)) {
              videoUrls.push(url);
            }
          }
        }
        request.continue();
      });
      
      await page.setCookie(...cookies);
      await page.goto(pageUrl, { waitUntil: 'networkidle2', timeout: 30000 });

      const title = await page.evaluate(() => {
        const video = document.querySelector('video');
        if (!video) return null;

        let container = video.parentElement;
        let attempts = 0;
        
        while (container && attempts < 15) {
          const titleSpan = container.querySelector('span.x1lliihq.x6ikm8r.x10wlt62.x1n2onr6.xlyipyv.xuxw1ft');
          if (titleSpan && titleSpan.textContent) {
            const text = titleSpan.textContent.trim();
            
            if (text.length > 5 && 
                !text.includes('Me gusta') && 
                !text.includes('Comentar') && 
                !text.includes('Compartir') &&
                !text.includes('Buscar') &&
                !text.includes('Reproducir') &&
                !text.includes('Configuración') &&
                !text.includes('Subtítulos') &&
                !text.includes('pantalla completa') &&
                !text.includes('visualizaciones') &&
                !text.includes('comentarios') &&
                !text.match(/^\d+:\d+$/)) {
              return text;
            }
          }

          container = container.parentElement;
          attempts++;
        }

        const titleElement = document.querySelector('meta[property="og:title"]');
        if (titleElement) {
          const content = titleElement.getAttribute('content');
          if (content && !content.includes('Facebook')) {
            return content;
          }
        }

        return null;
      });

      await new Promise(resolve => setTimeout(resolve, 3000));

      try {
        const videoElement = await page.$('video');
        if (videoElement) {
          await videoElement.scrollIntoView();
          await new Promise(resolve => setTimeout(resolve, 1000));
          await videoElement.click();
          await new Promise(resolve => setTimeout(resolve, 12000));
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

      const extractMetadata = (url: string) => {
        const efgMatch = url.match(/efg=([^&]+)/);
        if (efgMatch) {
          try {
            const urlDecoded = decodeURIComponent(efgMatch[1]);
            const base64Decoded = Buffer.from(urlDecoded, 'base64').toString('utf-8');
            const json = JSON.parse(base64Decoded);
            return {
              videoId: json.video_id?.toString(),
              assetId: json.xpv_asset_id?.toString(),
              duration: json.duration_s,
            };
          } catch (e) {
            this.logger.error('Error parsing efg:', e.message);
          }
        }
        return { videoId: null, assetId: null, duration: null };
      };

      this.logger.log(`Intercepted: ${videoUrls.length} videos, ${audioUrls.length} audios`);

      if (videoSrc && !videoSrc.includes('m3u8')) {
        const cleanUrl = this.removeRangeParams(videoSrc);
        const videoMeta = extractMetadata(videoSrc);
        
        let audioUrl: string | undefined;
        
        if (audioUrls.length > 0) {
          const matchingAudio = audioUrls.find(aUrl => {
            const aMeta = extractMetadata(aUrl);
            return (videoMeta.videoId && aMeta.videoId === videoMeta.videoId) ||
                   (videoMeta.assetId && aMeta.assetId === videoMeta.assetId);
          });
          
          if (matchingAudio) {
            audioUrl = this.removeRangeParams(matchingAudio);
            const audioMeta = extractMetadata(matchingAudio);
            this.logger.log(`✓ Matched: Video [${videoMeta.videoId}] ${videoMeta.duration}s + Audio [${audioMeta.videoId}] ${audioMeta.duration}s`);
          } else if (audioUrls.length > 0) {
            audioUrl = this.removeRangeParams(audioUrls[0]);
            const audioMeta = extractMetadata(audioUrls[0]);
            this.logger.warn(`⚠ No match: Video [${videoMeta.videoId}] ${videoMeta.duration}s + Audio [${audioMeta.videoId}] ${audioMeta.duration}s (fallback)`);
          }
        }
        
        return { success: true, videoUrl: cleanUrl, audioUrl, title: title ?? undefined };
      }

      if (videoUrls.length > 0) {
        const mp4Urls = videoUrls.filter(url => url.includes('.mp4') && !url.includes('m3u8'));
        
        if (mp4Urls.length > 0) {
          const cleanUrl = this.removeRangeParams(mp4Urls[0]);
          const videoMeta = extractMetadata(mp4Urls[0]);
          
          let audioUrl: string | undefined;
          
          if (audioUrls.length > 0) {
            const matchingAudio = audioUrls.find(aUrl => {
              const aMeta = extractMetadata(aUrl);
              return (videoMeta.videoId && aMeta.videoId === videoMeta.videoId) ||
                     (videoMeta.assetId && aMeta.assetId === videoMeta.assetId);
            });
            
            if (matchingAudio) {
              audioUrl = this.removeRangeParams(matchingAudio);
              const audioMeta = extractMetadata(matchingAudio);
              this.logger.log(`✓ Matched: Video [${videoMeta.videoId}] ${videoMeta.duration}s + Audio [${audioMeta.videoId}] ${audioMeta.duration}s`);
            } else if (audioUrls.length > 0) {
              audioUrl = this.removeRangeParams(audioUrls[0]);
              const audioMeta = extractMetadata(audioUrls[0]);
              this.logger.warn(`⚠ No match: Video [${videoMeta.videoId}] ${videoMeta.duration}s + Audio [${audioMeta.videoId}] ${audioMeta.duration}s (fallback)`);
            }
          }
          
          return { success: true, videoUrl: cleanUrl, audioUrl, title: title ?? undefined, candidates: mp4Urls };
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
        
        return { success: true, videoUrl: cleanUrl, audioUrl, title: title ?? undefined, candidates: videoMatches };
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
        return { success: true, videoUrl: foundVideoUrl, audioUrl: foundAudioUrl, title: title ?? undefined };
      }

      const windowData = await page.evaluate(() => {
        return (window as any).__d || (window as any).__REACT_HOT_LOADER__ || '';
      });

      if (windowData) {
        const dataStr = JSON.stringify(windowData);
        const dataMatches = dataStr.match(/https?:\/\/[^"'\s]+\.fbcdn\.net\/[^"'\s]+\.mp4/g);
        if (dataMatches && dataMatches.length > 0) {
          const cleanUrl = this.removeRangeParams(dataMatches[0]);
          return { success: true, videoUrl: cleanUrl, title: title ?? undefined, candidates: dataMatches };
        }
      }

      this.logger.warn(`Failed to extract video from ${pageUrl}`);
      
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

