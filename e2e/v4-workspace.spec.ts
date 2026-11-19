import {test,expect} from '@playwright/test'
test('CLAIM/OS 4.0: transparent stress set, clickable failure and no simulated provider claims',async({page})=>{
 const origin=new URL(test.info().project.use.baseURL??'http://127.0.0.1:4173').origin
 const requests:string[]=[]
 const writes:string[]=[]
 page.on('request',r=>{
  if(!r.url().startsWith(origin+'/'))requests.push(r.url())
  if(['POST','PUT','PATCH','DELETE'].includes(r.method()))writes.push(r.url())
 })
 await page.goto('/inca-demo/?evaluation=1')
 await expect(page.getByRole('heading',{name:/Every decision/})).toBeVisible()
 await expect(page.getByText('36-case stress test')).toBeVisible()
 await expect(page.getByText('LIVE AI EVALUATIONS')).toBeVisible()
 await expect(page.getByText('0',{exact:true}).first()).toBeVisible()
 await expect(page.locator('.v4-case-list button')).toHaveCount(36)
 await page.locator('.v4-checkbox input').check()
 const mismatches=await page.locator('.v4-case-list button').count()
 expect(mismatches).toBeGreaterThan(0)
 expect(mismatches).toBeLessThan(36)
 await page.locator('.v4-case-list button').first().click()
 await expect(page.locator('.v4-eval-detail')).toContainText('Label mismatch')
 await page.getByRole('button',{name:'Architecture'}).click()
 await expect(page.getByText('Independent readback')).toBeVisible()
 await page.getByRole('button',{name:'Evaluation',exact:true}).click()
 await expect(page.getByText('Measurement boundary')).toBeVisible()
 expect(requests).toEqual([])
 expect(writes).toEqual([])
})
test('mobile: shows working overview and evidence links without horizontal overflow',async({page})=>{
 await page.setViewportSize({width:390,height:844})
 await page.goto('/inca-demo/?evaluation=1')
 await expect(page.getByRole('heading',{name:/Every decision/})).toBeVisible()
 await expect(page.getByRole('link',{name:/Echte PDF-Belege prüfen/})).toBeVisible()
 await expect(page.getByRole('button',{name:/Evidenz & Tests ansehen/})).toBeVisible()
 await page.getByRole('button',{name:/Evidenz & Tests ansehen/}).click()
 await expect(page.getByText('36-case stress test')).toBeVisible()
 const width=await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth)
 expect(width).toBeLessThanOrEqual(1)
})
