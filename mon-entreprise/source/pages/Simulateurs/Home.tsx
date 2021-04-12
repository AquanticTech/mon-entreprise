import classnames from 'classnames'
import InfoBulle from 'Components/ui/InfoBulle'
import { IsEmbeddedContext } from 'Components/utils/embeddedContext'
import { HeadingWithAnchorLink } from 'Components/utils/markdown'
import { SitePathsContext } from 'Components/utils/SitePathsContext'
import { useContext } from 'react'
import emoji from 'react-easy-emoji'
import { Helmet } from 'react-helmet'
import { Trans, useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { TrackPage } from '../../ATInternetTracking'
import simulatorSvg from './images/illustration-simulateur.svg'
import useSimulatorsData, { SimulatorData } from './metadata'

export default function Simulateurs() {
	const { t } = useTranslation()
	const sitePaths = useContext(SitePathsContext)
	const language = useTranslation().i18n.language
	const simulators = useSimulatorsData()
	const titre = t('pages.simulateurs.accueil.titre', 'Simulateurs disponibles')
	return (
		<>
			<TrackPage chapter1="simulateurs" name="accueil" />
			<Helmet>
				<title>{titre}</title>
			</Helmet>
			<section css="display: flex; align-items: flex-start; justify-content: space-between">
				<div>
					<h1>{titre}</h1>
					<p className="ui__ lead">
						<Trans i18nKey="pages.simulateurs.accueil.header">
							Tous les simulateurs sur ce site sont maintenus à jour avec les
							dernières évolutions législatives.
						</Trans>
					</p>
				</div>

				<img
					className="ui__ hide-mobile"
					src={simulatorSvg}
					css="margin-left: 3rem; max-width: 15rem; transform: translateX(2rem) translateY(3rem) scale(1.4);"
				/>
			</section>
			<section>
				<HeadingWithAnchorLink level={2}>
					<Trans>Salariés et employeurs</Trans>
				</HeadingWithAnchorLink>
				<div className="ui__ box-container">
					<SimulateurCard {...simulators.salarié} />
					<SimulateurCard {...simulators['chômage-partiel']} />
					<SimulateurCard {...simulators['aides-embauche']} />
				</div>

				<HeadingWithAnchorLink level={2}>
					<Trans>Indépendants et dirigeants</Trans>
				</HeadingWithAnchorLink>
				<div className="ui__ box-container">
					<SimulateurCard {...simulators['auto-entrepreneur']} />
					<SimulateurCard {...simulators.indépendant} />
					<SimulateurCard {...simulators.sasu} />
					<SimulateurCard {...simulators['artiste-auteur']} />
					<SimulateurCard {...simulators['profession-libérale']} />
					<SimulateurCard {...simulators['comparaison-statuts']} />
				</div>
				<>
					<HeadingWithAnchorLink level={3}>
						<small>
							<Trans>Professions libérales</Trans>
						</small>
					</HeadingWithAnchorLink>
					<div className="ui__ small box-container">
						<SimulateurCard small {...simulators['auxiliaire-médical']} />
						<SimulateurCard small {...simulators['chirurgien-dentiste']} />
						<SimulateurCard small {...simulators.médecin} />
						<SimulateurCard small {...simulators['sage-femme']} />
						<SimulateurCard small {...simulators['avocat']} />
						<SimulateurCard small {...simulators['expert-comptable']} />
					</div>
				</>
				<HeadingWithAnchorLink level={2}>
					<Trans>Autres outils</Trans>
				</HeadingWithAnchorLink>
				<div className="ui__ box-container">
					<SimulateurCard {...simulators['is']} />
					{language === 'fr' && (
						<SimulateurCard {...simulators['demande-mobilité']} />
					)}
					<SimulateurCard {...simulators['économie-collaborative']} />
					<SimulateurCard {...simulators['aide-déclaration-indépendant']} />
				</div>
			</section>
			<section>
				<Trans i18nKey="page.simulateurs.accueil.description">
					<p>Tous les simulateurs sur ce site sont :</p>
					<ul>
						<li>
							<strong>Maintenus à jour</strong> avec les dernières évolutions
							législatives
						</li>
						<li>
							<strong>Améliorés en continu</strong> afin d'augmenter le nombre
							de dispositifs pris en compte
						</li>
						<li>
							<strong>Intégrables facilement et gratuitement</strong> sur
							n'importe quel site internet.{' '}
							<Link to={sitePaths.integration.iframe}>En savoir plus</Link>.
						</li>
					</ul>
				</Trans>
			</section>
		</>
	)
}

export function SimulateurCard({
	small = false,
	shortName,
	meta,
	path,
	tooltip,
	iframePath,
	icône,
}: SimulatorData[keyof SimulatorData] & {
	small?: boolean
}) {
	const isIframe = useContext(IsEmbeddedContext)
	const name = (
		<span>
			{shortName} {tooltip && <InfoBulle>{tooltip}</InfoBulle>}
		</span>
	)
	return (
		<Link
			className={classnames('ui__ interactive card box light-border', {
				small,
			})}
			key={path}
			to={{
				state: { fromSimulateurs: true },
				pathname: (isIframe && iframePath) || path,
			}}
		>
			<div className={classnames('ui__ box-icon', { big: !small })}>
				{emoji(icône)}
			</div>
			<>{small ? name : <h3>{name}</h3>}</>
			{!small && meta?.description && (
				<p className="ui__ notice">{meta.description}</p>
			)}
		</Link>
	)
}
