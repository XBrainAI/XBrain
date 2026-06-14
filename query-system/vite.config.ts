import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import fs from 'fs'

// 自动生成 school_files 目录文件列表的插件
function generateSchoolFilesList() {
  return {
    name: 'generate-school-files-list',
    configureServer(server: any) {
      server.middlewares.use('/school-files-list.json', (_req: any, res: any, _next: any) => {
        const schoolFilesDir = path.resolve(__dirname, './database/school_files')
        let files: string[] = []
        if (fs.existsSync(schoolFilesDir)) {
          files = fs.readdirSync(schoolFilesDir).filter((f: string) => f.endsWith('.md'))
        }
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify(files))
      })
    },
    buildStart() {
      // 构建时生成静态 JSON 文件到 public 目录
      const schoolFilesDir = path.resolve(__dirname, './database/school_files')
      const publicDir = path.resolve(__dirname, 'public')
      let files: string[] = []
      if (fs.existsSync(schoolFilesDir)) {
        files = fs.readdirSync(schoolFilesDir).filter((f: string) => f.endsWith('.md'))
      }
      if (!fs.existsSync(publicDir)) {
        fs.mkdirSync(publicDir, { recursive: true })
      }
      fs.writeFileSync(
        path.join(publicDir, 'school-files-list.json'),
        JSON.stringify(files, null, 2)
      )
    }
  }
}

// 自动生成 other_infos 目录文件列表的插件
function generateOtherInfosList() {
  return {
    name: 'generate-other-infos-list',
    configureServer(server: any) {
      server.middlewares.use('/other-infos-list.json', (_req: any, res: any, _next: any) => {
        const otherInfosDir = path.resolve(__dirname, 'other_infos')
        let files: string[] = []
        if (fs.existsSync(otherInfosDir)) {
          files = fs.readdirSync(otherInfosDir).filter((f: string) => f.endsWith('.html') || f.endsWith('.md'))
        }
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify(files))
      })
    },
    buildStart() {
      // 构建时生成静态 JSON 文件到 public 目录
      const otherInfosDir = path.resolve(__dirname, 'other_infos')
      const publicDir = path.resolve(__dirname, 'public')
      let files: string[] = []
      if (fs.existsSync(otherInfosDir)) {
        files = fs.readdirSync(otherInfosDir).filter((f: string) => f.endsWith('.html') || f.endsWith('.md'))
      }
      if (!fs.existsSync(publicDir)) {
        fs.mkdirSync(publicDir, { recursive: true })
      }
      fs.writeFileSync(
        path.join(publicDir, 'other-infos-list.json'),
        JSON.stringify(files, null, 2)
      )
    }
  }
}

// 构建完成后复制静态资源到 dist 根目录
function copyStaticAssetsPlugin() {
  return {
    name: 'copy-static-assets',
    writeBundle() {
      const distDir = path.resolve(__dirname, 'dist')
      if (!fs.existsSync(distDir)) {
        fs.mkdirSync(distDir, { recursive: true })
      }

      // 复制 school_files
      const schoolFilesDir = path.resolve(__dirname, './database/school_files')
      if (fs.existsSync(schoolFilesDir)) {
        const files = fs.readdirSync(schoolFilesDir)
        for (const file of files) {
          fs.copyFileSync(
            path.join(schoolFilesDir, file),
            path.join(distDir, file)
          )
        }
      }

      // 复制 other_infos 目录
      const otherInfosDir = path.resolve(__dirname, 'other_infos')
      const distOtherInfosDir = path.join(distDir, 'other_infos')
      if (fs.existsSync(otherInfosDir)) {
        if (!fs.existsSync(distOtherInfosDir)) {
          fs.mkdirSync(distOtherInfosDir, { recursive: true })
        }
        const files = fs.readdirSync(otherInfosDir)
        for (const file of files) {
          fs.copyFileSync(
            path.join(otherInfosDir, file),
            path.join(distOtherInfosDir, file)
          )
        }
      }
    }
  }
}

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [react(), generateSchoolFilesList(), generateOtherInfosList(), copyStaticAssetsPlugin()],
  server: {
    allowedHosts: true,
  },
})
