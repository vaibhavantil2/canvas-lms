/*
 * Copyright (C) 2015 - present Instructure, Inc.
 *
 * This file is part of Canvas.
 *
 * Canvas is free software: you can redistribute it and/or modify it under
 * the terms of the GNU Affero General Public License as published by the Free
 * Software Foundation, version 3 of the License.
 *
 * Canvas is distributed in the hope that it will be useful, but WITHOUT ANY
 * WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 * A PARTICULAR PURPOSE. See the GNU Affero General Public License for more
 * details.
 *
 * You should have received a copy of the GNU Affero General Public License along
 * with this program. If not, see <http://www.gnu.org/licenses/>.
 */

import React from 'react'
import ReactDOM from 'react-dom'
import getDroppableDashboardCardBox from './react/getDroppableDashboardCardBox'
import DashboardCard from './react/DashboardCard'
import axios from '@canvas/axios'
import {asJson, getPrefetchedXHR} from '@instructure/js-utils'
import buildURL from 'axios/lib/helpers/buildURL'

let promiseToGetDashboardCards

export function createDashboardCards(dashboardCards, cardComponent = DashboardCard, extraProps) {
  const Box = getDroppableDashboardCardBox()

  // Decide which dashboard to show based on role
  const isTeacher = dashboardCards.some(card => card.enrollmentType === 'TeacherEnrollment')

  return (
    <Box
      showSplitDashboardView={isTeacher}
      courseCards={dashboardCards}
      hideColorOverlays={window.ENV?.PREFERENCES?.hide_dashcard_color_overlays}
      cardComponent={cardComponent}
      {...extraProps}
    />
  )
}

function renderIntoDOM(dashboardCards) {
  const dashboardContainer = document.getElementById('DashboardCard_Container')
  ReactDOM.render(createDashboardCards(dashboardCards), dashboardContainer)
}

export default function loadCardDashboard(renderFn = renderIntoDOM, observedUser) {
  if (!promiseToGetDashboardCards) {
    let xhrHasReturned = false
    let sessionStorageTimeout
    const sessionStorageKey = `dashcards_for_user_${ENV && ENV.current_user_id}`
    const urlPrefix = '/api/v1/dashboard/dashboard_cards'
    const url = buildURL(urlPrefix, {observed_user: observedUser})
    promiseToGetDashboardCards =
      asJson(getPrefetchedXHR(url)) || axios.get(url).then(({data}) => data)
    promiseToGetDashboardCards.then(() => (xhrHasReturned = true))

    // Because we use prefetch_xhr to prefetch this xhr request from our rails erb, there is a
    // chance that the XHR to get the latest dashcard data has already come back before we get
    // to this point. So if the XHR is ready, there's no need to render twice, just render
    // once with the newest data.
    // Otherwise, render with the cached stuff from session storage now, then render again
    // when the xhr comes back with the latest data.
    const promiseToGetCardsFromSessionStorage = new Promise(resolve => {
      sessionStorageTimeout = setTimeout(() => {
        const cachedCards = sessionStorage.getItem(sessionStorageKey)
        if (cachedCards) resolve(JSON.parse(cachedCards))
      }, 1)
    })
    Promise.race([promiseToGetDashboardCards, promiseToGetCardsFromSessionStorage]).then(
      dashboardCards => {
        clearTimeout(sessionStorageTimeout)
        // calling the renderFn with `false` indicates to consumers that we're still waiting
        // on the follow-up xhr request to complete.
        renderFn(dashboardCards, xhrHasReturned)
        // calling it with `true` indicates that all outstanding card promises have settled.
        if (!xhrHasReturned)
          return promiseToGetDashboardCards.then(cards => renderFn(cards, true, observedUser))
      }
    )

    // Cache the fetched dashcards in sessionStorage so we can render instantly next
    // time they come to their dashboard (while still fetching the most current data)
    promiseToGetDashboardCards.then(dashboardCards =>
      sessionStorage.setItem(sessionStorageKey, JSON.stringify(dashboardCards))
    )
  } else {
    promiseToGetDashboardCards.then(cards => renderFn(cards, true))
  }
}

export function resetDashboardCards() {
  promiseToGetDashboardCards = undefined
}
