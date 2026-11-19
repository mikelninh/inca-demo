import {test,expect} from '@playwright/test'
import fs from 'node:fs/promises'

test('real generated PDFs are parsed, pages shown and mutations fail closed',async({page})=>{
  const unauthorizedRequests:string[]=[]
  const writes:string[]=[]
  const origin=new URL(test.info().project.use.baseURL??'http://127.0.0.1:4173').origin
  page.on('request',r=>{
    if(!r.url().startsWith(origin+'/'))unauthorizedRequests.push(r.url())
    if(['POST','PUT','PATCH','DELETE'].includes(r.method()))writes.push(r.url())
  })
  await page.goto('/inca-demo/?lab=1')
  await expect(page.getByRole('heading',{name:/See the evidence/})).toBeVisible()
  await expect(page.locator('.doclab-file')).toHaveCount(3,{timeout:30000})
  await expect(page.locator('.doclab-status')).toContainText('Widerspruch')
  await expect(page.locator('.doclab-stats')).toContainText('4')
  await expect.poll(async()=>page.locator('.doclab-pdf-canvas').evaluate((x:HTMLCanvasElement)=>x.width),{timeout:30000}).toBeGreaterThan(100)
  await page.getByRole('button',{name:/Deckungsgrenze/}).last().click()
  await expect(page.locator('.doclab-reader-toolbar')).toContainText('2 / 2')
  await expect(page.locator('.doclab-page-source mark')).toContainText(/Vorschaden/)
  await expect(page.locator('.doclab-page-anchor').first()).toBeVisible()
  await page.getByRole('button',{name:'Zitat manipulieren'}).click()
  await expect(page.locator('.doclab-status')).toContainText('Fundstelle ungültig')
  await page.getByRole('button',{name:'Normal'}).click()
  await expect(page.locator('.doclab-status')).toContainText('Widerspruch')
  const downloadPromise=page.waitForEvent('download')
  await page.getByRole('button',{name:/PDF herunterladen/}).click()
  const pdfDownload=await downloadPromise
  const bytes=await fs.readFile(await pdfDownload.path() as string)
  expect(bytes.subarray(0,5).toString()).toBe('%PDF-')
  await page.locator('input[type=file]').setInputFiles({
    name:'Vertrag_Test.pdf',mimeType:'application/pdf',buffer:bytes
  })
  await expect(page.locator('.doclab-file')).toHaveCount(1)
  await expect(page.locator('.doclab-status')).toContainText('Fehlende Unterlagen')
  await page.getByRole('button',{name:/02 \/ Leitungswasser/}).click()
  await expect(page.locator('.doclab-file')).toHaveCount(3)
  await expect(page.locator('.doclab-status')).toContainText('Prüffähig')
  await page.getByRole('button',{name:/03 \/ Einbruch/}).click()
  await expect(page.locator('.doclab-file')).toHaveCount(2)
  await expect(page.locator('.doclab-status')).toContainText('Fehlende Unterlagen')
  const auditPromise=page.waitForEvent('download')
  await page.getByRole('button',{name:/Prüfquittung ohne Rohdaten exportieren/}).click()
  const auditDownload=await auditPromise
  const data=JSON.parse(await fs.readFile(await auditDownload.path() as string,'utf8'))
  expect(data.schema).toBe('inca-document-lab-audit-v0.3')
  expect(data.autonomous_payment_allowed).toBe(false)
  expect(data.raw_source_text_exported).toBe(false)
  expect(data.measured_worker_time_saving).toBe(null)
  expect(JSON.stringify(data)).not.toMatch(/Schadenmeldung_HR-C09\.pdf|Einbruchdiebstahl laut/)
  expect(unauthorizedRequests).toEqual([])
  expect(writes).toEqual([])
})
