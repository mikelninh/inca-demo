import {test,expect} from '@playwright/test'
import fs from 'node:fs/promises'

test('v0.4 mission: real PDFs, source navigation, fail-closed tests and honest metrics',async({page})=>{
 const origin=new URL(test.info().project.use.baseURL??'http://127.0.0.1:4173').origin
 const external:string[]=[]
 const writes:string[]=[]
 page.on('request',r=>{
  if(!r.url().startsWith(origin+'/'))external.push(r.url())
  if(['POST','PUT','PATCH','DELETE'].includes(r.method()))writes.push(r.url())
 })
 await page.goto('/inca-demo/')
 await expect(page.getByRole('heading',{name:/Automate the work/})).toBeVisible()
 await expect(page.locator('.mission-scenarios button')).toHaveCount(3)
 await expect(page.locator('.mission-file-list button')).toHaveCount(3,{timeout:30000})
 await expect(page.locator('.mission-state')).toContainText('Widerspruch prüfen')
 await expect(page.locator('.mission-eval-score')).toContainText('40')
 await expect.poll(async()=>page.locator('.mission-canvas')
  .evaluate((c:HTMLCanvasElement)=>c.width),{timeout:30000}).toBeGreaterThan(100)
 await page.locator('.mission-sourcelist button').first().click()
 await expect(page.locator('.mission-highlight mark')).not.toBeEmpty()
 const pdfPromise=page.waitForEvent('download')
 await page.getByRole('button',{name:'PDF herunterladen'}).click()
 const download=await pdfPromise
 expect((await fs.readFile(await download.path() as string)).subarray(0,5).toString()).toBe('%PDF-')
 await page.getByRole('button',{name:/Beleg manipulieren/}).click()
 await expect(page.locator('.mission-state')).toContainText('Quelle ungültig')
 await page.getByRole('button',{name:/Normalbetrieb/}).click()
 await expect(page.locator('.mission-state')).toContainText('Widerspruch')
 await page.getByRole('button',{name:/Rechnung entfernen/}).click()
 await expect(page.locator('.mission-state')).toContainText('Belege fehlen')
 await expect(page.locator('.mission-file-list button')).toHaveCount(2)
 await page.getByRole('button',{name:/Normalbetrieb/}).click()
 await page.locator('.mission-scenarios button').nth(1).click()
 await expect(page.locator('.mission-state')).toContainText('Fachprüfung vorbereiten')
 await page.getByRole('button',{name:/Interne Prüfung simulieren/}).click()
 await expect(page.getByText('Nur als lokale Demo-Aktion markiert.')).toBeVisible()
 await page.locator('.mission-scenarios button').nth(2).click()
 await expect(page.locator('.mission-state')).toContainText('Belege fehlen')
 await expect(page.locator('.mission-file-list button')).toHaveCount(2)
 if(new URL(test.info().project.use.baseURL??'').hostname.endsWith('github.io')){
  await page.getByRole('button',{name:/Live-Agent aufrufen/}).click()
  await expect(page.locator('.mission-model-status')).toContainText('GitHub Pages')
 }
 expect(external).toEqual([])
 expect(writes).toEqual([])
})
test('v0.4 mobile: evidence workflow remains usable',async({page})=>{
 await page.setViewportSize({width:390,height:844})
 await page.goto('/inca-demo/')
 await expect(page.getByRole('heading',{name:/Automate the work/})).toBeVisible()
 await expect(page.locator('.mission-file-list button')).toHaveCount(3,{timeout:30000})
 const width=await page.evaluate(()=>document.documentElement.scrollWidth)
 expect(width).toBeLessThanOrEqual(391)
 await page.locator('.mission-sourcelist button').first().click()
 await expect(page.locator('.mission-highlight mark')).not.toBeEmpty()
})
