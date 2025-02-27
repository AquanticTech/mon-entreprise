import { readFileSync, statSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { argv } from 'node:process'

import Tinypool from 'tinypool'

import { absoluteSitePaths } from './source/sitePaths.js'

const filename = new URL('./prerender-worker.js', import.meta.url).href
const pool = new Tinypool({ filename })

const sitePathFr = absoluteSitePaths.fr
const sitePathEn = absoluteSitePaths.en

export const pagesToPrerender: {
	'mon-entreprise': string[]
	infrance: string[]
} = {
	'mon-entreprise': [
		'/iframes/pamc',
		'/iframes/simulateur-embauche',
		'/iframes/simulateur-independant',
		sitePathFr.assistants['choix-du-statut'].index,
		sitePathFr.index,
		sitePathFr.simulateurs.comparaison,
		sitePathFr.simulateurs.dividendes,
		sitePathFr.simulateurs.eurl,
		sitePathFr.simulateurs.indépendant,
		sitePathFr.simulateurs.index,
		sitePathFr.simulateurs.is,
		sitePathFr.simulateurs.salarié,
		sitePathFr.simulateurs.sasu,
		sitePathFr.simulateurs['artiste-auteur'],
		sitePathFr.simulateurs['auto-entrepreneur'],
		sitePathFr.simulateurs['chômage-partiel'],
		sitePathFr.simulateurs['coût-création-entreprise'],
		sitePathFr.simulateurs['entreprise-individuelle'],
		sitePathFr.simulateurs['profession-libérale'].avocat,
		sitePathFr.simulateurs['profession-libérale']['chirurgien-dentiste'],
		sitePathFr.simulateurs['profession-libérale'].index,
	].map((val) => encodeURI(val)),
	infrance: [
		sitePathEn.index,
		sitePathEn.simulateurs.salarié,
		'/iframes/simulateur-embauche',
	].map((val) => encodeURI(val)),
}

const dev = argv.findIndex((val) => val === '--dev') > -1

const redirects = await Promise.all(
	Object.entries(pagesToPrerender).flatMap(([site, urls]) =>
		urls.map((url) =>
			pool
				.run({
					site,
					url,
					lang: site === 'mon-entreprise' ? 'fr' : 'en',
				})
				.then((path: string) => {
					return `
[[redirects]]
	from = ":SITE_${site === 'mon-entreprise' ? 'FR' : 'EN'}${
						dev ? decodeURI(url) : url
					}"
	to = "/${path}"
	status = 200
${dev ? '  force = true\n' : ''}`
				})
		)
	)
)

// Replace the #[prerender]# tag in netlify.toml if --netlify-toml-path is specified

const index = argv.findIndex((val) => val === '--netlify-toml-path')

if (index > -1 && argv[index + 1]) {
	const netlifyTomlPath = resolve(argv[index + 1])

	if (statSync(netlifyTomlPath).isFile()) {
		const data = readFileSync(netlifyTomlPath, { encoding: 'utf8' })

		if (/#\[prerender\]#/g.test(data)) {
			writeFileSync(
				netlifyTomlPath,
				data.replace(/#\[prerender\]#/g, redirects.join(''))
			)

			// eslint-disable-next-line no-console
			console.log('Redirects added to ' + netlifyTomlPath)
		} else {
			throw new Error('tag #[prerender]# not found in ' + netlifyTomlPath)
		}
	} else {
		throw new Error('this path is not a file' + netlifyTomlPath)
	}
}
