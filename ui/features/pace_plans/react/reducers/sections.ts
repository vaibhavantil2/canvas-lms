/*
 * Copyright (C) 2021 - present Instructure, Inc.
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

import {Sections, Section, StoreState} from '../types'

export const sectionsInitialState: Sections = (window.ENV.SECTIONS || []) as Sections

/* Selectors */

export const getSections = (state: StoreState): Sections => state.sections
export const getSection = (state: StoreState, id: number): Section => state.sections[id]

/* Reducers */

export const sectionsReducer = (state = sectionsInitialState, action: any): Sections => {
  switch (action.type) {
    default:
      return state
  }
}
