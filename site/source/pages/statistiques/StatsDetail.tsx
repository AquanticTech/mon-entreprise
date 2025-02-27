import { formatValue } from 'publicodes'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'
import { BrushProps } from 'recharts'
import styled from 'styled-components'

import { toAtString } from '@/components/ATInternetTracking'
import PagesChart from '@/components/charts/PagesCharts'
import { useScrollToHash } from '@/components/utils/markdown'
import { Item, Message, Radio, ToggleGroup } from '@/design-system'
import { Emoji } from '@/design-system/emoji'
import { Select } from '@/design-system/field/Select'
import InfoBulle from '@/design-system/InfoBulle'
import { Grid, Spacing } from '@/design-system/layout'
import { H2, H3 } from '@/design-system/typography/heading'
import { Body } from '@/design-system/typography/paragraphs'
import useSimulatorsData, { SimulatorData } from '@/hooks/useSimulatorsData'
import { debounce, groupBy } from '@/utils'

import { SimulateurCard } from '../simulateurs-et-assistants'
import { AccessibleTable } from './AccessibleTable'
import Chart, { Data, formatLegend, isDataStacked } from './Chart'
import SatisfactionChart from './SatisfactionChart'
import { BigIndicator } from './StatsGlobal'
import { Page, PageChapter2, PageSatisfaction, StatsStruct } from './types'
import { formatDay, formatMonth } from './utils'

type Period = 'mois' | 'jours'
type Chapter2 = PageChapter2 | 'PAM' | 'api-rest'

type Pageish = Page | PageSatisfaction

interface StatsDetailProps {
	stats: StatsStruct
	accessibleMode: boolean
}

export const StatsDetail = ({ stats, accessibleMode }: StatsDetailProps) => {
	const defaultPeriod = 'mois'
	const [searchParams, setSearchParams] = useSearchParams()
	useScrollToHash()

	const [period, setPeriod] = useState<Period>(
		(searchParams.get('periode') as Period) ?? defaultPeriod
	)
	const [chapter2, setChapter2] = useState<Chapter2 | ''>(
		(searchParams.get('module') as Chapter2) ?? ''
	)

	const { t } = useTranslation()

	useEffect(() => {
		const paramsEntries = [
			['periode', period !== defaultPeriod ? period : ''],
			['module', chapter2],
		].filter(([, val]) => val !== '') as [string, string][]

		setSearchParams(paramsEntries, { replace: true })
	}, [period, chapter2, setSearchParams])

	const visites = useMemo(() => {
		const rawData = period === 'jours' ? stats.visitesJours : stats.visitesMois
		if (!chapter2) {
			return rawData.site
		}
		if (chapter2 === 'api-rest') {
			return (rawData.api ?? []).map(({ date, ...nombre }) => ({
				date,
				nombre,
				info:
					(period === 'jours' ? '2023-06-16' : '2023-06-01') === date ? (
						<ChangeJune2023 />
					) : null,
			}))
		}
		if (chapter2 === 'guide') {
			const pages = rawData.pages as Pageish[]
			const creer = rawData.creer as Pageish[]

			return statsCreer(pages, creer)
		}

		return filterByChapter2(rawData.pages as Pageish[], chapter2)
	}, [period, chapter2])

	const repartition = useMemo(() => {
		const rawData = stats.visitesMois

		return groupByDate(rawData.pages as Pageish[])
	}, [])

	const satisfaction = useMemo(() => {
		return filterByChapter2(stats.satisfaction as Pageish[], chapter2)
	}, [chapter2]) as Array<{
		date: string
		nombre: Record<string, number>
		percent: Record<string, number>
	}>

	const [[startDateIndex, endDateIndex], setDateIndex] = useState<
		[startIndex: number, endIndex: number]
	>([0, visites.length - 1])

	useEffect(() => {
		setDateIndex([0, visites.length - 1])
	}, [visites.length])

	const [slicedVisits, setSlicedVisits] = useState(visites)
	useEffect(() => {
		setSlicedVisits(visites)
	}, [visites])

	// eslint-disable-next-line react-hooks/exhaustive-deps
	const handleDateChange = useCallback(
		debounce(1000, ({ startIndex, endIndex }) => {
			if (startIndex != null && endIndex != null) {
				setDateIndex([startIndex, endIndex])
				setSlicedVisits(visites.slice(startIndex, endIndex + 1))
			}
		}) as NonNullable<BrushProps['onChange']>,
		[visites]
	)

	const totals: number | Record<string, number> = useMemo(
		() => computeTotals(slicedVisits),
		[slicedVisits]
	)

	const chapters2: Chapter2[] = [
		...new Set(stats.visitesMois?.pages.map((p) => p.page_chapter2)),
		'PAM',
	]

	type ApiData = {
		date: string
		nombre: { evaluate: number; rules: number; rule: number }
	}
	const apiCumul =
		chapter2 === 'api-rest' &&
		slicedVisits.length > 0 &&
		typeof slicedVisits[0]?.nombre === 'object' &&
		(slicedVisits as ApiData[]).reduce(
			(acc, { nombre }) => ({
				evaluate: acc.evaluate + nombre.evaluate,
				rules: acc.rules + nombre.rules,
				rule: acc.rule + nombre.rule,
			}),
			{ evaluate: 0, rules: 0, rule: 0 }
		)

	return (
		<>
			<H2>Statistiques détaillées</H2>

			<Indicators>
				<div
					css={`
						flex-basis: 50%;
					`}
				>
					<SimulateursChoice
						onChange={setChapter2}
						value={chapter2}
						possibleValues={chapters2}
					/>
					<Spacing sm />
					<Grid container columns={4}>
						{chapter2 && <SelectedSimulator chapter2={chapter2} />}
					</Grid>
				</div>
				<div>
					<StyledBody id="mode-affichage-label">
						<Trans>Afficher les données par :</Trans>
					</StyledBody>
					<ToggleGroup
						onChange={(val) => setPeriod(val as Period)}
						defaultValue={period}
						aria-labelledby="mode-affichage-label"
						aria-controls="visites-panel"
					>
						<Radio value="jours">
							<Trans>Jours</Trans>
						</Radio>
						<Radio value="mois">
							<Trans>Mois</Trans>
						</Radio>
					</ToggleGroup>
					<Spacing sm />
				</div>
			</Indicators>

			<div id="visites-panel">
				<H3>Visites</H3>

				{visites.length ? (
					accessibleMode ? (
						<AccessibleTable
							period={period}
							data={visites.map(({ date, nombre }) => ({
								date,
								nombre:
									typeof nombre === 'number' ? { visites: nombre } : nombre,
							}))}
							formatKey={(key) =>
								key === 'visites' ? t('Nombre de visites') : formatLegend(key)
							}
							caption={
								<Trans>
									Tableau indiquant le nombre de visites sur le site
									mon-entreprise par{' '}
									{{ period: period === 'jours' ? t('jours') : t('mois') }}.
								</Trans>
							}
						/>
					) : (
						<Chart
							key={period + visites.length.toString()}
							period={period}
							data={visites}
							onDateChange={handleDateChange}
							startIndex={startDateIndex}
							endIndex={endDateIndex}
						/>
					)
				) : (
					<Message type="info">Aucune donnée disponible.</Message>
				)}
			</div>

			{slicedVisits.length > 0 && (
				<H3>
					Cumuls pour la période{' '}
					{period === 'jours'
						? `du ${formatDay(slicedVisits[0].date)} au ${formatDay(
								slicedVisits[slicedVisits.length - 1].date
						  )}`
						: `de ${formatMonth(slicedVisits[0].date)}` +
						  (slicedVisits.length > 1
								? ` à ${formatMonth(
										slicedVisits[slicedVisits.length - 1].date
								  )}`
								: '')}
				</H3>
			)}

			<Grid container spacing={2}>
				{apiCumul ? (
					<>
						<BigIndicator
							main={apiCumul.evaluate}
							subTitle="Appel à /evaluate"
						/>
						<BigIndicator main={apiCumul.rules} subTitle="Appel à /rules" />
						<BigIndicator main={apiCumul.rule} subTitle="Appel à /rule/*" />
					</>
				) : (
					<BigIndicator
						main={formatValue(
							typeof totals === 'number' ? totals : totals.accueil
						)}
						subTitle="Visites"
					/>
				)}

				{typeof totals !== 'number' && 'simulation_commencee' in totals && (
					<>
						{' '}
						<BigIndicator
							main={formatValue(totals.simulation_commencee)}
							subTitle="Simulations "
						/>
						<BigIndicator
							main={formatValue(
								Math.round(
									(100 * totals.simulation_commencee) / totals.accueil
								),
								{ displayedUnit: '%' }
							)}
							subTitle={
								<>
									Taux de conversion&nbsp;
									<InfoBulle>
										Pourcentage de personne qui commencent une simulation
									</InfoBulle>
								</>
							}
						/>
					</>
				)}
			</Grid>

			{period === 'mois' && !!satisfaction.length && (
				<>
					<H3>Satisfaction</H3>
					<SatisfactionChart
						key={chapter2}
						data={satisfaction}
						accessibleMode={accessibleMode}
					/>
				</>
			)}

			{chapter2 === '' && period === 'mois' && (
				<>
					<H2>Simulateurs principaux</H2>
					<PagesChart data={repartition} accessibleMode={accessibleMode} />
				</>
			)}
		</>
	)
}

const ChangeJune2023 = () => (
	<Body style={{ maxWidth: '350px' }}>
		<Trans i18nKey="stats.change_june_2023">
			Ajout d'un cache sur l'API pour améliorer les performances et réduire le
			nombre de requêtes.
		</Trans>
	</Body>
)

const isPAM = (name: string | undefined) =>
	name &&
	[
		'medecin',
		'chirurgien_dentiste',
		'auxiliaire_medical',
		'sage_femme',
	].includes(name)

const filterByChapter2 = (pages: Pageish[], chapter2: Chapter2 | '') => {
	return Object.entries(
		groupBy(
			pages.filter(
				(p) =>
					!chapter2 ||
					((!('page' in p) || p.page !== 'accueil_pamc') &&
						(p.page_chapter2 === chapter2 ||
							(chapter2 === 'PAM' && isPAM(p.page_chapter3))))
			),
			(p) => ('date' in p ? p.date : p.month)
		)
	).map(([date, values]) => ({
		date,
		nombre: Object.fromEntries(
			Object.entries(
				groupBy(values, (x) => ('page' in x ? x.page : x.click))
			).map(([key, values]) => [
				key,
				values.reduce((sum, value) => sum + value.nombre, 0),
			])
		),
	}))
}

const statsCreer = (pages: Pageish[], creer: Pageish[]) => {
	const accueil = groupBy(
		pages.filter(
			(p) =>
				'page' in p &&
				p.page === 'accueil' &&
				p.page_chapter1 === 'creer' &&
				true
		),
		(p) => ('date' in p ? p.date : p.month)
	)

	const commencee = groupBy(
		creer.filter(
			(p) =>
				'page' in p &&
				p.page === 'accueil' &&
				p.page_chapter1 === 'creer' &&
				true
		),
		(p) => ('date' in p ? p.date : p.month)
	)
	const terminee = groupBy(
		creer.filter(
			(p) =>
				'page' in p &&
				p.page !== 'liste' &&
				p.page_chapter1 === 'creer' &&
				(p.page_chapter2 as string) === 'statut' &&
				true
		),
		(p) => ('date' in p ? p.date : p.month)
	)

	return Object.entries(commencee).map(([date, values]) => ({
		date,
		nombre: {
			accueil: accueil[date]?.reduce((acc, p) => acc + p.nombre, 0),
			simulation_commencee: values.reduce((acc, p) => acc + p.nombre, 0),
			simulation_terminee: terminee[date]?.reduce(
				(acc, p) => acc + p.nombre,
				0
			),
		},
	}))
}

function groupByDate(data: Pageish[]) {
	const topTenPageByMonth = Object.entries(
		groupBy(
			data.filter((d) => 'page' in d && d.page === 'accueil'),
			(p) => ('date' in p ? p.date : p.month)
		)
	).map(([date, values]) => ({
		date,
		nombre: Object.fromEntries(
			Object.entries(
				groupBy(values, (x) => x.page_chapter1 + ' / ' + x.page_chapter2)
			).map(
				([k, v]) =>
					[k, v.map((v) => v.nombre).reduce((a, b) => a + b, 0)] as const
			)
		),
	}))

	const topPagesOfAllTime = Object.entries(
		topTenPageByMonth.reduce((acc, { nombre }) => {
			Object.entries(nombre).forEach(([page, visits]) => {
				acc[page] ??= 0
				acc[page] += visits
			})

			return acc
		}, {} as Record<string, number>)
	)
		.sort((a, b) => b[1] - a[1])
		.slice(0, 8)
		.map(([page]) => page)

	return topTenPageByMonth.map(({ date, nombre }) => ({
		date,
		nombre: Object.fromEntries(
			Object.entries(nombre).filter(([page]) =>
				topPagesOfAllTime.includes(page)
			)
		),
	}))
}

const computeTotals = (
	data: Data<number> | Data<Record<string, number>>
): number | Record<string, number> => {
	return isDataStacked(data)
		? data
				.map((d) => d.nombre)
				.reduce(
					(acc, record) =>
						[...Object.entries(acc), ...Object.entries(record)].reduce(
							(merge, [key, value]) => {
								return { ...merge, [key]: (acc[key] ?? 0) + value }
							},
							{}
						),
					{}
				)
		: data.map((d) => d.nombre).reduce((a, b) => a + b, 0)
}

function getChapter2(s: SimulatorData[keyof SimulatorData]): Chapter2 | '' {
	if ('iframePath' in s && s.iframePath === 'pamc') {
		return 'PAM'
	}
	if (!s.tracking) {
		return ''
	}
	const tracking = s.tracking as { chapter2?: Chapter2 }
	const chapter2 =
		typeof tracking === 'string' ? tracking : tracking.chapter2 ?? ''

	return toAtString(chapter2) as typeof chapter2
}

function SelectedSimulator(props: { chapter2: Chapter2 | '' }) {
	const simulateur = Object.values(useSimulatorsData()).find(
		(s) =>
			getChapter2(s) === props.chapter2 &&
			!(
				typeof s.tracking === 'object' &&
				'chapter3' in s.tracking &&
				s.tracking.chapter3
			)
	)
	if (!simulateur) {
		return null
	}

	return <SimulateurCard small {...simulateur} />
}

function SimulateursChoice(props: {
	onChange: (ch: Chapter2 | '') => void
	value: Chapter2 | ''
	possibleValues: Array<Chapter2>
}) {
	const simulateurs = Object.values(useSimulatorsData())
		.filter((s) => {
			const chapter2 = getChapter2(s)

			return (
				chapter2 &&
				props.possibleValues.includes(chapter2) &&
				!(
					typeof s.tracking === 'object' &&
					'chapter3' in s.tracking &&
					s.tracking.chapter3
				)
			)
		})
		.sort((a, b) => (a.shortName < b.shortName ? -1 : 1))

	return (
		<Select
			onSelectionChange={(val) => {
				props.onChange(
					typeof val === 'string' && val.length && !isNaN(parseInt(val))
						? getChapter2(simulateurs[parseInt(val)])
						: val === 'api-rest'
						? val
						: ''
				)
			}}
			defaultSelectedKey={props.value || 'general-stats'}
			label={'Voir les statistiques pour :'}
			id="simulator-choice-input"
		>
			{[
				<Item key="general-stats" textValue="Tout le site">
					<Emoji emoji="🌍" />
					&nbsp;Tout le site
				</Item>,
				<Item key="api-rest" textValue="API REST">
					<Emoji emoji="👩‍💻" />
					&nbsp;API REST
				</Item>,
				...simulateurs.map((s, i) => (
					<Item key={i} textValue={s.shortName}>
						{s.icône && (
							<>
								<Emoji emoji={s.icône} />
								&nbsp;
							</>
						)}
						{s.shortName}
					</Item>
				)),
			]}
		</Select>
	)
}

const Indicators = styled.div`
	display: flex;
	flex-direction: column;
	justify-content: space-between;
	gap: 12px;

	@media (min-width: ${({ theme }) => theme.breakpointsWidth.sm}) {
		flex-direction: row;
		align-items: flex-end;
	}
`

const StyledBody = styled(Body)`
	margin-bottom: 0.25rem;
`
