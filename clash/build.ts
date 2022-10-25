import download from "download";
import fs from 'node:fs/promises'
import yaml from 'yaml'
import { HttpsProxyAgent} from 'hpagent'

function isFullDomainRule(rule: string) {
    return rule.startsWith('full:')
}
function isRegexDomainRule(rule: string) {
    return rule.startsWith('regexp:')
}

function isIncludeRule(rule: string) {
    return rule.startsWith('include:')
}

function isInvalidRule(rule?: string) {
    return !rule || !(rule.trim()) || rule.startsWith('#')
}

function parse(rules: string[]) {
    const result = {
        include: Array<string>(),
        fullDomain: Array<string>(),
        subdomain: Array<string>(),
    }
    for (const rule of rules) {
        if(isInvalidRule(rule)) {
            continue
        } else if(isFullDomainRule(rule)) {
            result.fullDomain.push(rule.slice(5))
        } else if(isRegexDomainRule(rule)) {
        } else if(isIncludeRule(rule)) {
            result.include.push(rule.slice(8))
        } else {
            result.subdomain.push(`+.${rule}`)
        }
    }
    return result
}

// https://raw.iqiq.io/v2fly/domain-list-community/master/data/category-porn
async function parseUrl(url: string) {
    console.log(url)
    const file = await download(url, 'tmp', {
            agent: new HttpsProxyAgent({
                proxy: 'http://127.0.0.1:7890'
        })
    })
    const rules = file.toString('utf-8').split('\n')
    const result = parse(rules)
    for (const includeRule of result.include) {
        const downloadUrl = `https://raw.iqiq.io/v2fly/domain-list-community/master/data/${includeRule}`
        const includeResult = await parseUrl(downloadUrl)
        result.fullDomain =  result.fullDomain.concat(includeResult.fullDomain)
        result.subdomain = result.subdomain.concat(includeResult.subdomain)
    }
    return result
}
const result = await parseUrl('https://raw.iqiq.io/v2fly/domain-list-community/master/data/category-porn')
const yamlObj = {
    payload: Array<string>()
}
yamlObj.payload = yamlObj.payload.concat(result.subdomain)
yamlObj.payload = yamlObj.payload.concat(result.fullDomain)
await fs.writeFile('./tmp/porn.yaml', yaml.stringify(yamlObj))