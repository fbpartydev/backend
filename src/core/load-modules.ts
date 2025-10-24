import * as path from 'path';
import * as fs from 'fs';

// Devuelve una lista de clases de módulos encontradas en src/modules
export function getAllModules(): any[] {
  const modulesDir = path.join(__dirname, '../modules');
  if (!fs.existsSync(modulesDir)) return [];

  return fs.readdirSync(modulesDir)
    .map((folder) => {
      const moduleFile = fs.readdirSync(path.join(modulesDir, folder)).find(f => f.endsWith('.module.js'));
      if (moduleFile) {
        const modulePath = path.join(modulesDir, folder, moduleFile);
        const imported = require(modulePath);
        const moduleClass = Object.values(imported).find(
          (exp: any) => typeof exp === 'function' && exp.name.endsWith('Module')
        );
        return moduleClass;
      }
      return null;
    })
    .filter(Boolean);
} 