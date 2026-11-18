import {test,expect} from '@playwright/test'
import fs from 'node:fs/promises'

test('a first-time reviewer completes all eight synthetic cases and voluntarily exports local results',async({page})=>{
  const externalWrites:string[]=[]
  page.on('request',r=>{
    if(['POST','PUT','PATCH','DELETE'].includes(r.method()))externalWrites.push(r.url())
  })
  await page.goto('/inca-demo/?study=1')
  await expect(page.getByRole('heading',{name:/Correct decisions/})).toBeVisible()
  await expect(page.getByRole('button',{name:/Prüfung starten/})).toBeDisabled()
  await page.locator('.research-consent input[type="checkbox"]').check()
  await page.getByRole('button',{name:/Prüfung starten/}).click()
  for(let i=0;i<8;i++){
    await expect(page.getByText('FALL '+(i+1)+' / 8')).toBeVisible()
    const link=page.locator('.research-evidence-link').first()
    if(await link.count()){
      await link.click()
      await expect(link).toHaveClass(/is-active/)
    }
    await page.locator('#research-decision').selectOption('refer_to_human')
    await page.locator('#research-rating').selectOption('uncertain')
    await page.getByRole('button',{name:/Prüfung abschliessen/}).click()
  }
  await expect(page.getByText('Dein Test ist abgeschlossen.')).toBeVisible()
  await expect(page.getByText(/keine kausale Zeitersparnis/)).toBeVisible()
  const downloadPromise=page.waitForEvent('download')
  await page.getByRole('button',{name:/Anonymisierte Ergebnisse exportieren/}).click()
  const download=await downloadPromise
  const contents=JSON.parse(await fs.readFile(await download.path() as string,'utf8'))
  expect(contents.schema).toBe('inca-review-trial-0.1')
  expect(contents.results).toHaveLength(8)
  expect(new Set(contents.results.map((r:{caseId:string})=>r.caseId)).size).toBe(8)
  expect(contents.results.filter((r:{arm:string})=>r.arm==='reference')).toHaveLength(4)
  expect(contents.results.filter((r:{arm:string})=>r.arm==='evidence_assist')).toHaveLength(4)
  expect(contents.summary.actionable_real_world_workload_claim).toBe(false)
  expect(JSON.stringify(contents)).not.toContain('fnol_text')
  expect(externalWrites).toEqual([])
})
