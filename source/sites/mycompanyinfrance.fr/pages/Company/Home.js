/* @flow */
import React from 'react'
import { connect } from 'react-redux'
import { Link } from 'react-router-dom'
import { nextQuestionUrlSelector } from 'Selectors/companyStatusSelectors'
import type { Match } from 'react-router'
type Props = {
	match: Match,
	nextQuestionUrl: string
}
const CreateMyCompany = ({ match, nextQuestionUrl }: Props) => (
	<>
		<h1 className="question__title">Register a company</h1>
		<Link className="ui__ link-button" to="/register/find">
			My company is already registered with the French Administration
		</Link>
		<p>
			The French business law defines more than 20 possible legal statuses to
			declare a company. It may be quite complicated to find your way through
			all the acronyms and specific procedures. SAS, SARL, SA, EIRL ... Thanks
			to this guide, you will quickly find the proper status that suits to your
			needs, as well as the checklist of the associated steps.
		</p>
		{match.isExact && (
			<div className="ui__ answer-group">
				<Link className="ui__ button" to={nextQuestionUrl}>
					Choose the legal status
				</Link>
				<Link to={'/social-security'} className="ui__ skip-button">
					Do it later ›
				</Link>
			</div>
		)}
	</>
)

export default connect(
	state => ({ nextQuestionUrl: nextQuestionUrlSelector(state) }),
	null
)(CreateMyCompany)
