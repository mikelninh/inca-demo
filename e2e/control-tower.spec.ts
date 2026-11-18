import {test,expect} from '@playwright/test'
import fs from 'node:fs/promises'

test('Control Tower fails closed, shows original evidence and exports a safe local receipt',async({page})=>{
  const writes:string[]=[]
  const external:string[]=[]
  const origin=new URL(test.info().project.use.baseURL??'http://127.0.0.1:4173').origin
  page.on('request',request=>{
    if(['POST','PATCH','PUT','DELETE'].includes(request.method()))writes.push(request.url())
    if(!request.url().startsWith(origin+'/'))external.push(request.url())
  })
  await page.goto('/inca-demo/?ops=1')
  await expect(page.getByRole('heading',{name:/From uncertainty/})).toBeVisible()
  await expect(page.locator('.tower-board')).toBeVisible()
  await expect(page.locator('.tower-gate')).toContainText('TEXTMATCH')
  await expect(page.locator('.tower-recommend')).toContainText('Menschliche Prüfung')
  await page.getByRole('button',{name:/Rechnung fehlt/}).click()
  await expect(page.locator('.tower-gate')).toContainText('BLOCKIERT')
  await expect(page.locator('.tower-recommend')).toContainText('Menschliche Prüfung')
  await page.getByRole('button',{name:/Zitat manipuliert/}).click()
  await expect(page.locator('.tower-gate')).toContainText('BLOCKIERT')
  await page.getByRole('button',{name:/Normalfall/}).click()
  await expect(page.locator('.tower-gate')).toContainText('TEXTMATCH')
  await page.getByRole('button',{name:'POLICY ORIGINALFELD'}).click()
  await expect(page.locator('.tower-paper')).toContainText('Vollkasko')
  await page.getByRole('button',{name:'Audit'}).click()
  const downloadPromise=page.waitForEvent('download')
  await page.getByRole('button',{name:/Audit als JSON exportieren/}).click()
  const download=await downloadPromise
  const payload=JSON.parse(await fs.readFile(await download.path() as string,'utf8'))
  expect(payload.schema).toBe('inca-control-tower-receipt-v0.1')
  expect(payload.case_id).toBe('KFZ-2026-003')
  expect(payload.autonomous_payment_possible).toBe(false)
  expect(payload.measured_workload_savings).toBe(null)
  expect(payload.source_refs.length).toBeGreaterThan(0)
  expect(JSON.stringify(payload)).not.toContain('Beim Ausparken')
  expect(external).toEqual([])
  expect(writes).toEqual([])
})
