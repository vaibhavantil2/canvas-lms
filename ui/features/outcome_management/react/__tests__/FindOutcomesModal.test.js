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

import React from 'react'
import {MockedProvider} from '@apollo/react-testing'
import {act, render as rtlRender, fireEvent} from '@testing-library/react'
import FindOutcomesModal from '../FindOutcomesModal'
import OutcomesContext, {
  ACCOUNT_GROUP_ID,
  ROOT_GROUP_ID
} from '@canvas/outcomes/react/contexts/OutcomesContext'
import {createCache} from '@canvas/apollo'
import * as FlashAlert from '@canvas/alerts/react/FlashAlert'
import {findModalMocks} from '@canvas/outcomes/mocks/Outcomes'
import {
  findOutcomesMocks,
  groupMocks,
  importGroupMocks,
  importOutcomeMocks
} from '@canvas/outcomes/mocks/Management'
import {clickEl} from '@canvas/outcomes/react/helpers/testHelpers'

jest.mock('@canvas/progress/resolve_progress')
jest.useFakeTimers()

describe('FindOutcomesModal', () => {
  let cache
  let onCloseHandlerMock
  let showFlashAlertSpy
  let isMobileView
  const courseImportMocks = [
    ...findModalMocks(),
    ...groupMocks({groupId: '100'}),
    ...findOutcomesMocks({
      groupId: '300',
      isImported: false,
      contextType: 'Course',
      outcomesCount: 51
    })
  ]
  const defaultProps = (props = {}) => ({
    open: true,
    onCloseHandler: onCloseHandlerMock,
    ...props
  })

  beforeEach(() => {
    onCloseHandlerMock = jest.fn()
    cache = createCache()
    showFlashAlertSpy = jest.spyOn(FlashAlert, 'showFlashAlert')
    window.ENV = {}
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  const render = (
    children,
    {
      contextType = 'Account',
      contextId = '1',
      mocks = findModalMocks(),
      renderer = rtlRender,
      globalRootId = '',
      rootIds = [ACCOUNT_GROUP_ID, ROOT_GROUP_ID, globalRootId]
    } = {}
  ) => {
    return renderer(
      <OutcomesContext.Provider
        value={{
          env: {
            contextType,
            contextId,
            isMobileView,
            globalRootId,
            rootIds,
            treeBrowserRootGroupId: ROOT_GROUP_ID,
            treeBrowserAccountGroupId: ACCOUNT_GROUP_ID
          }
        }}
      >
        <MockedProvider cache={cache} mocks={mocks}>
          {children}
        </MockedProvider>
      </OutcomesContext.Provider>
    )
  }

  const itBehavesLikeAModal = () => {
    it('renders component with "Add Outcomes to Account" title when contextType is Account', async () => {
      const {getByText} = render(<FindOutcomesModal {...defaultProps()} />)
      await act(async () => jest.runAllTimers())
      expect(getByText('Add Outcomes to Account')).toBeInTheDocument()
    })

    it('renders component with "Add Outcomes to Course" title when contextType is Course', async () => {
      const {getByText} = render(<FindOutcomesModal {...defaultProps()} />, {
        contextType: 'Course'
      })
      await act(async () => jest.runAllTimers())
      expect(getByText('Add Outcomes to Course')).toBeInTheDocument()
    })

    it('shows modal if open prop true', async () => {
      const {getByText} = render(<FindOutcomesModal {...defaultProps()} />)
      await act(async () => jest.runAllTimers())
      expect(getByText('Close')).toBeInTheDocument()
    })

    it('does not show modal if open prop false', async () => {
      const {queryByText} = render(<FindOutcomesModal {...defaultProps({open: false})} />)
      await act(async () => jest.runAllTimers())
      expect(queryByText('Close')).not.toBeInTheDocument()
    })

    it('calls onCloseHandlerMock on Close button click', async () => {
      const {getByText} = render(<FindOutcomesModal {...defaultProps()} />)
      await act(async () => jest.runAllTimers())
      const closeBtn = getByText('Close')
      fireEvent.click(closeBtn)
      expect(onCloseHandlerMock).toHaveBeenCalledTimes(1)
    })

    describe('error handling', () => {
      describe('within an account', () => {
        it('displays a screen reader error and text error on failed request', async () => {
          const {getByText} = render(<FindOutcomesModal {...defaultProps()} />, {mocks: []})
          await act(async () => jest.runAllTimers())
          expect(showFlashAlertSpy).toHaveBeenCalledWith({
            message: 'An error occurred while loading account learning outcome groups.',
            srOnly: true,
            type: 'error'
          })
          expect(getByText(/An error occurred while loading account outcomes/)).toBeInTheDocument()
        })
      })

      describe('within a course', () => {
        it('displays a screen reader error and text error on failed request', async () => {
          const {getByText} = render(<FindOutcomesModal {...defaultProps()} />, {
            contextType: 'Course',
            mocks: []
          })
          await act(async () => jest.runAllTimers())
          expect(showFlashAlertSpy).toHaveBeenCalledWith({
            message: 'An error occurred while loading course learning outcome groups.',
            srOnly: true,
            type: 'error'
          })
          expect(getByText(/An error occurred while loading course outcomes/)).toBeInTheDocument()
        })
      })
    })
  }

  const itBehavesLikeATreeBrowser = () => {
    const clickWithinMobileSelect = async selectNode => {
      if (isMobileView) {
        fireEvent.click(selectNode)
        await act(async () => jest.runAllTimers())
      }
    }

    it('clears selected outcome group for the outcomes view after closing and reopening', async () => {
      const {getByText, queryByText, rerender} = render(<FindOutcomesModal {...defaultProps()} />)
      await act(async () => jest.runAllTimers())
      await clickWithinMobileSelect(queryByText('Groups'))
      fireEvent.click(getByText('Account Standards'))
      fireEvent.click(getByText('Root Account Outcome Group 0'))
      await act(async () => jest.runAllTimers())
      await clickWithinMobileSelect(queryByText('View 0 Outcomes'))
      await act(async () => jest.runAllTimers())
      expect(getByText('All Root Account Outcome Group 0 Outcomes')).toBeInTheDocument()
      fireEvent.click(getByText('Done'))
      render(<FindOutcomesModal {...defaultProps({open: false})} />, {renderer: rerender})
      await act(async () => jest.runAllTimers())
      render(<FindOutcomesModal {...defaultProps()} />, {renderer: rerender})
      await act(async () => jest.runAllTimers())
      expect(queryByText('All Root Account Outcome Group 0 Outcomes')).not.toBeInTheDocument()
    })

    it('debounces the search string entered by the user', async () => {
      const {getByText, getByLabelText, queryByText} = render(
        <FindOutcomesModal {...defaultProps()} />,
        {
          mocks: [...findModalMocks(), ...findOutcomesMocks()]
        }
      )
      await act(async () => jest.runAllTimers())
      await clickWithinMobileSelect(queryByText('Groups'))
      fireEvent.click(getByText('Account Standards'))
      fireEvent.click(getByText('Root Account Outcome Group 0'))
      await act(async () => jest.runAllTimers())
      await clickWithinMobileSelect(queryByText('View 25 Outcomes'))
      await act(async () => jest.runAllTimers())
      expect(getByText('25 Outcomes')).toBeInTheDocument()
      const input = getByLabelText('Search field')
      fireEvent.change(input, {target: {value: 'mathemati'}})
      await act(async () => jest.advanceTimersByTime(100))
      expect(getByText('25 Outcomes')).toBeInTheDocument()
      fireEvent.change(input, {target: {value: 'mathematic'}})
      await act(async () => jest.advanceTimersByTime(300))
      expect(getByText('25 Outcomes')).toBeInTheDocument()
      fireEvent.change(input, {target: {value: 'mathematics'}})
      await act(async () => jest.advanceTimersByTime(500))
      expect(getByText('15 Outcomes')).toBeInTheDocument()
    })

    describe('within an account context', () => {
      it('renders Account Standards groups for non root accounts', async () => {
        const {getByText, queryByText} = render(<FindOutcomesModal {...defaultProps()} />)
        await act(async () => jest.runAllTimers())
        await clickWithinMobileSelect(queryByText('Groups'))
        fireEvent.click(getByText('Account Standards'))
        await act(async () => jest.runAllTimers())
        expect(getByText('Root Account Outcome Group 0')).toBeInTheDocument()
      })

      it('Does not render Account Standards groups for root accounts', async () => {
        const {queryByText} = render(<FindOutcomesModal {...defaultProps()} />, {
          mocks: findModalMocks({parentAccountChildren: 0})
        })
        await act(async () => jest.runAllTimers())
        expect(queryByText('Account Standards')).not.toBeInTheDocument()
      })
    })

    it('displays a flash alert when a child group fails to load', async () => {
      const {getByText, queryByText} = render(<FindOutcomesModal {...defaultProps()} />, {
        contextType: 'Course'
      })
      await act(async () => jest.runAllTimers())
      await clickWithinMobileSelect(queryByText('Groups'))
      await clickEl(getByText('Account Standards'))
      await clickEl(getByText('Course Account Outcome Group'))
      expect(showFlashAlertSpy).toHaveBeenCalledWith({
        message: 'An error occurred while loading course learning outcome groups.',
        type: 'error',
        srOnly: false
      })
    })

    it('should not disable search input and clear search button if there are no results', async () => {
      const {getByText, getByLabelText, queryByTestId, queryByText} = render(
        <FindOutcomesModal {...defaultProps()} />,
        {
          mocks: [...findModalMocks(), ...findOutcomesMocks()]
        }
      )
      await act(async () => jest.runAllTimers())
      await clickWithinMobileSelect(queryByText('Groups'))
      fireEvent.click(getByText('Account Standards'))
      fireEvent.click(getByText('Root Account Outcome Group 0'))
      await act(async () => jest.runAllTimers())
      await clickWithinMobileSelect(queryByText('View 25 Outcomes'))
      await act(async () => jest.runAllTimers())
      expect(getByText('25 Outcomes')).toBeInTheDocument()
      const input = getByLabelText('Search field')
      fireEvent.change(input, {target: {value: 'no results'}})
      await act(async () => jest.advanceTimersByTime(500))
      expect(getByLabelText('Search field')).toBeEnabled()
      expect(queryByTestId('clear-search-icon')).toBeInTheDocument()
    })

    describe('global standards', () => {
      it('renders the State Standards group and subgroups', async () => {
        const {getByText, queryByText} = render(<FindOutcomesModal {...defaultProps()} />, {
          mocks: findModalMocks({includeGlobalRootGroup: true}),
          globalRootId: '1'
        })
        await act(async () => jest.runAllTimers())
        await clickWithinMobileSelect(queryByText('Groups'))
        fireEvent.click(getByText('State Standards'))
        await act(async () => jest.runAllTimers())
      })

      it('does not render the State Standard group if no globalRootId is set', async () => {
        const {queryByText, getByText} = render(<FindOutcomesModal {...defaultProps()} />, {
          mocks: findModalMocks({includeGlobalRootGroup: true})
        })
        await act(async () => jest.runAllTimers())
        expect(getByText(/An error occurred while loading account outcomes/)).toBeInTheDocument()
        expect(queryByText('State Standards')).not.toBeInTheDocument()
      })

      it('does not list outcomes within the State Standard group', async () => {
        const {getByText, queryByText} = render(<FindOutcomesModal {...defaultProps()} />, {
          mocks: [...findModalMocks({includeGlobalRootGroup: true}), ...groupMocks({groupId: '1'})],
          globalRootId: '1'
        })
        await act(async () => jest.runAllTimers())
        await clickWithinMobileSelect(queryByText('Groups'))
        fireEvent.click(getByText('State Standards'))
        await act(async () => jest.runAllTimers())
        expect(getByText('Select a group to reveal outcomes here.')).toBeInTheDocument()
      })
    })
  }

  describe('Desktop', () => {
    beforeEach(() => {
      isMobileView = false
    })
    itBehavesLikeAModal()
    itBehavesLikeATreeBrowser()

    it('does not render the action drilldown', async () => {
      const {queryByText} = render(<FindOutcomesModal {...defaultProps()} />)
      await act(async () => jest.runAllTimers())
      expect(queryByText('Groups')).not.toBeInTheDocument()
    })

    describe('group import', () => {
      it('imports group without ConfirmationBox if Add All Outcomes button is clicked in Account context', async () => {
        const {getByText, getAllByText} = render(<FindOutcomesModal {...defaultProps()} />, {
          contextType: 'Account',
          mocks: [
            ...findModalMocks(),
            ...groupMocks({groupId: '100'}),
            ...findOutcomesMocks({groupId: '300'}),
            ...importGroupMocks({groupId: '300'})
          ]
        })
        await act(async () => jest.runAllTimers())
        await clickEl(getByText('Account Standards'))
        await clickEl(getByText('Root Account Outcome Group 0'))
        await clickEl(getByText('Group 100 folder 0'))
        await clickEl(getByText('Add All Outcomes').closest('button'))
        expect(
          getAllByText(
            'All outcomes from Group 300 have been successfully added to this account.'
          )[0]
        ).toBeInTheDocument()
      })

      it('imports group without ConfirmationBox if Add All Outcomes button is clicked in Course context and outcomes <= 50', async () => {
        const {getByText, getAllByText} = render(<FindOutcomesModal {...defaultProps()} />, {
          contextType: 'Course',
          mocks: [
            ...findModalMocks(),
            ...groupMocks({groupId: '100'}),
            ...findOutcomesMocks({
              groupId: '300',
              isImported: false,
              contextType: 'Course',
              outcomesCount: 50
            }),
            ...importGroupMocks({
              groupId: '300',
              targetContextType: 'Course'
            })
          ]
        })
        await act(async () => jest.runAllTimers())
        await clickEl(getByText('Account Standards'))
        await clickEl(getByText('Root Account Outcome Group 0'))
        await clickEl(getByText('Group 100 folder 0'))
        await clickEl(getByText('Add All Outcomes').closest('button'))
        expect(
          getAllByText(
            'All outcomes from Group 300 have been successfully added to this course.'
          )[0]
        ).toBeInTheDocument()
      })

      it('disables Add All Outcomes button during/after group import', async () => {
        const {getByText} = render(<FindOutcomesModal {...defaultProps()} />, {
          contextType: 'Course',
          mocks: [
            ...courseImportMocks,
            ...importGroupMocks({
              groupId: '300',
              targetContextType: 'Course'
            })
          ]
        })
        await act(async () => jest.runAllTimers())
        await clickEl(getByText('Account Standards'))
        await clickEl(getByText('Root Account Outcome Group 0'))
        await clickEl(getByText('Group 100 folder 0'))
        const AddAllButton = getByText('Add All Outcomes').closest('button')
        expect(AddAllButton).toBeEnabled()
        await clickEl(AddAllButton)
        fireEvent.click(getByText('Import Anyway'))
        expect(AddAllButton).toBeDisabled()
        await act(async () => jest.runAllTimers())
        expect(AddAllButton).toBeDisabled()
      })

      it('imports outcomes with ConfirmationBox if Add All Outcomes button is clicked in Course context and outcomes > 50', async () => {
        const {getByText} = render(<FindOutcomesModal {...defaultProps()} />, {
          contextType: 'Course',
          mocks: [
            ...courseImportMocks,
            ...importGroupMocks({
              groupId: '300',
              targetContextType: 'Course'
            })
          ]
        })
        await act(async () => jest.runAllTimers())
        await clickEl(getByText('Account Standards'))
        await clickEl(getByText('Root Account Outcome Group 0'))
        await clickEl(getByText('Group 100 folder 0'))
        await clickEl(getByText('Add All Outcomes').closest('button'))
        expect(getByText('You are about to add 51 outcomes to this course.')).toBeInTheDocument()
      })

      it('returns focus on Add All Outcomes button if Cancel button of ConfirmationBox is clicked', async () => {
        const {getByText} = render(<FindOutcomesModal {...defaultProps()} />, {
          contextType: 'Course',
          mocks: courseImportMocks
        })
        await act(async () => jest.runAllTimers())
        await clickEl(getByText('Account Standards'))
        await clickEl(getByText('Root Account Outcome Group 0'))
        await clickEl(getByText('Group 100 folder 0'))
        const AddAllButton = getByText('Add All Outcomes').closest('button')
        await clickEl(AddAllButton)
        expect(getByText('You are about to add 51 outcomes to this course.')).toBeInTheDocument()
        expect(AddAllButton).not.toHaveFocus()
        await clickEl(getByText('Cancel'))
        expect(AddAllButton).toHaveFocus()
      })

      it('returns focus on Done button if Import Anyway button of ConfirmationBox is clicked', async () => {
        const {getByText} = render(<FindOutcomesModal {...defaultProps()} />, {
          contextType: 'Course',
          mocks: courseImportMocks
        })
        await act(async () => jest.runAllTimers())
        await clickEl(getByText('Account Standards'))
        await clickEl(getByText('Root Account Outcome Group 0'))
        await clickEl(getByText('Group 100 folder 0'))
        const DoneButton = getByText('Done').closest('button')
        await clickEl(getByText('Add All Outcomes').closest('button'))
        expect(getByText('You are about to add 51 outcomes to this course.')).toBeInTheDocument()
        expect(DoneButton).not.toHaveFocus()
        await clickEl(getByText('Import Anyway'))
        expect(DoneButton).toHaveFocus()
      })

      it('enables Add All Outcomes button if group import fails', async () => {
        const {getByText} = render(<FindOutcomesModal {...defaultProps()} />, {
          contextType: 'Course',
          mocks: [
            ...courseImportMocks,
            ...importGroupMocks({
              groupId: '300',
              targetContextType: 'Course',
              failResponse: true
            })
          ]
        })
        await act(async () => jest.runAllTimers())
        await clickEl(getByText('Account Standards'))
        await clickEl(getByText('Root Account Outcome Group 0'))
        await clickEl(getByText('Group 100 folder 0'))
        const AddAllButton = getByText('Add All Outcomes').closest('button')
        await clickEl(AddAllButton)
        await clickEl(getByText('Import Anyway'))
        expect(AddAllButton).toBeEnabled()
      })

      it('replaces Add buttons of individual outcomes with loading spinner during group import', async () => {
        const {getByText, getAllByText} = render(<FindOutcomesModal {...defaultProps()} />, {
          contextType: 'Course',
          mocks: [
            ...courseImportMocks,
            ...importGroupMocks({
              groupId: '300',
              targetContextType: 'Course'
            })
          ]
        })
        await act(async () => jest.runAllTimers())
        await clickEl(getByText('Account Standards'))
        await clickEl(getByText('Root Account Outcome Group 0'))
        await clickEl(getByText('Group 100 folder 0'))
        expect(getAllByText('Add').length).toBe(2)
        await clickEl(getByText('Add All Outcomes').closest('button'))
        fireEvent.click(getByText('Import Anyway'))
        expect(getAllByText('Loading').length).toBe(2)
      })

      it('changes button text of individual outcomes from Add to Added after group import completes', async () => {
        const {getByText, getAllByText} = render(<FindOutcomesModal {...defaultProps()} />, {
          contextType: 'Course',
          mocks: [
            ...courseImportMocks,
            ...importGroupMocks({
              groupId: '300',
              targetContextType: 'Course'
            })
          ]
        })
        await act(async () => jest.runAllTimers())
        await clickEl(getByText('Account Standards'))
        await clickEl(getByText('Root Account Outcome Group 0'))
        await clickEl(getByText('Group 100 folder 0'))
        expect(getAllByText('Add').length).toBe(2)
        await clickEl(getByText('Add All Outcomes').closest('button'))
        await clickEl(getByText('Import Anyway'))
        expect(getAllByText('Added').length).toBe(2)
      })

      it('displays flash confirmation with proper message if group import to Course succeeds', async () => {
        const {getByText, getAllByText} = render(<FindOutcomesModal {...defaultProps()} />, {
          contextType: 'Course',
          mocks: [
            ...courseImportMocks,
            ...importGroupMocks({
              groupId: '300',
              targetContextType: 'Course'
            })
          ]
        })
        await act(async () => jest.runAllTimers())
        await clickEl(getByText('Account Standards'))
        await clickEl(getByText('Root Account Outcome Group 0'))
        await clickEl(getByText('Group 100 folder 0'))
        await clickEl(getByText('Add All Outcomes').closest('button'))
        await clickEl(getByText('Import Anyway'))
        expect(
          getAllByText(
            'All outcomes from Group 300 have been successfully added to this course.'
          )[0]
        ).toBeInTheDocument()
      })

      it('displays flash confirmation with proper message if group import to Account succeeds', async () => {
        const {getByText, getAllByText} = render(<FindOutcomesModal {...defaultProps()} />, {
          contextType: 'Account',
          mocks: [
            ...findModalMocks(),
            ...groupMocks({groupId: '100'}),
            ...findOutcomesMocks({groupId: '300'}),
            ...importGroupMocks({groupId: '300'})
          ]
        })
        await act(async () => jest.runAllTimers())
        await clickEl(getByText('Account Standards'))
        await clickEl(getByText('Root Account Outcome Group 0'))
        await clickEl(getByText('Group 100 folder 0'))
        await clickEl(getByText('Add All Outcomes').closest('button'))
        expect(
          getAllByText(
            'All outcomes from Group 300 have been successfully added to this account.'
          )[0]
        ).toBeInTheDocument()
      })

      it('displays flash alert with custom error message if group import fails', async () => {
        const {getByText, getAllByText} = render(<FindOutcomesModal {...defaultProps()} />, {
          contextType: 'Course',
          mocks: [
            ...courseImportMocks,
            ...importGroupMocks({
              groupId: '300',
              targetContextType: 'Course',
              failResponse: true
            })
          ]
        })
        await act(async () => jest.runAllTimers())
        await clickEl(getByText('Account Standards'))
        await clickEl(getByText('Root Account Outcome Group 0'))
        await clickEl(getByText('Group 100 folder 0'))
        await clickEl(getByText('Add All Outcomes').closest('button'))
        await clickEl(getByText('Import Anyway'))
        expect(
          getAllByText(
            'An error occurred while importing these outcomes: GraphQL error: Network error.'
          )[0]
        ).toBeInTheDocument()
      })

      it('displays flash alert with generic error message if group import fails and no error message', async () => {
        const {getByText, getAllByText} = render(<FindOutcomesModal {...defaultProps()} />, {
          contextType: 'Course',
          mocks: [
            ...courseImportMocks,
            ...importGroupMocks({
              groupId: '300',
              targetContextType: 'Course',
              failMutationNoErrMsg: true
            })
          ]
        })
        await act(async () => jest.runAllTimers())
        await clickEl(getByText('Account Standards'))
        await clickEl(getByText('Root Account Outcome Group 0'))
        await clickEl(getByText('Group 100 folder 0'))
        await clickEl(getByText('Add All Outcomes').closest('button'))
        await clickEl(getByText('Import Anyway'))
        expect(
          getAllByText('An error occurred while importing these outcomes.')[0]
        ).toBeInTheDocument()
      })
    })

    describe('individual outcome import', () => {
      it('replaces Add button of outcome with loading spinner during outcome import', async () => {
        const {getByText, getAllByText} = render(<FindOutcomesModal {...defaultProps()} />, {
          contextType: 'Course',
          mocks: [
            ...courseImportMocks,
            ...importOutcomeMocks({
              outcomeId: '5',
              targetContextType: 'Course',
              sourceContextId: '1',
              sourceContextType: 'Account'
            })
          ]
        })
        await act(async () => jest.runAllTimers())
        await clickEl(getByText('Account Standards'))
        await clickEl(getByText('Root Account Outcome Group 0'))
        await clickEl(getByText('Group 100 folder 0'))
        fireEvent.click(getAllByText('Add')[0].closest('button'))
        expect(getByText('Loading')).toBeInTheDocument()
      })

      it('changes button text of outcome from Add to Added after outcome import completes', async () => {
        const {getByText, getAllByText} = render(<FindOutcomesModal {...defaultProps()} />, {
          contextType: 'Course',
          mocks: [
            ...courseImportMocks,
            ...importOutcomeMocks({
              outcomeId: '5',
              targetContextType: 'Course',
              sourceContextId: '1',
              sourceContextType: 'Account'
            })
          ]
        })
        await act(async () => jest.runAllTimers())
        await clickEl(getByText('Account Standards'))
        await clickEl(getByText('Root Account Outcome Group 0'))
        await clickEl(getByText('Group 100 folder 0'))
        await clickEl(getAllByText('Add')[0].closest('button'))
        expect(getByText('Added')).toBeInTheDocument()
      })

      it('enables Add button if outcome import fails', async () => {
        const {getByText, getAllByText} = render(<FindOutcomesModal {...defaultProps()} />, {
          contextType: 'Course',
          mocks: [
            ...courseImportMocks,
            ...importOutcomeMocks({
              outcomeId: '5',
              targetContextType: 'Course',
              sourceContextId: '1',
              sourceContextType: 'Account',
              failResponse: true
            })
          ]
        })
        await act(async () => jest.runAllTimers())
        await clickEl(getByText('Account Standards'))
        await clickEl(getByText('Root Account Outcome Group 0'))
        await clickEl(getByText('Group 100 folder 0'))
        const addButton = getAllByText('Add')[0].closest('button')
        await clickEl(addButton)
        expect(addButton).toBeEnabled()
      })

      it('imports Account outcome to a Course', async () => {
        const {getByText, getAllByText} = render(<FindOutcomesModal {...defaultProps()} />, {
          contextType: 'Course',
          mocks: [
            ...courseImportMocks,
            ...importOutcomeMocks({
              outcomeId: '5',
              targetContextType: 'Course',
              sourceContextId: '1',
              sourceContextType: 'Account'
            })
          ]
        })
        await act(async () => jest.runAllTimers())
        await clickEl(getByText('Account Standards'))
        await clickEl(getByText('Root Account Outcome Group 0'))
        await clickEl(getByText('Group 100 folder 0'))
        const AddButton = getAllByText('Add')[0].closest('button')
        expect(AddButton).toBeEnabled()
        await clickEl(AddButton)
        expect(getByText('Added')).toBeInTheDocument()
        expect(getByText('Added').closest('button')).toBeDisabled()
      })

      it('imports Account outcome to a Sub-account', async () => {
        const {getByText, getAllByText} = render(<FindOutcomesModal {...defaultProps()} />, {
          contextType: 'Account',
          mocks: [
            ...findModalMocks(),
            ...groupMocks({groupId: '100'}),
            ...findOutcomesMocks({
              groupId: '300',
              isImported: false,
              contextType: 'Account',
              outcomesGroupContextId: '2',
              outcomesCount: 51
            }),
            ...importOutcomeMocks({
              outcomeId: '5',
              sourceContextId: '2',
              sourceContextType: 'Account'
            })
          ]
        })
        await act(async () => jest.runAllTimers())
        await clickEl(getByText('Account Standards'))
        await clickEl(getByText('Root Account Outcome Group 0'))
        await clickEl(getByText('Group 100 folder 0'))
        const AddButton = getAllByText('Add')[0].closest('button')
        expect(AddButton).toBeEnabled()
        await clickEl(AddButton)
        expect(getByText('Added')).toBeInTheDocument()
        expect(getByText('Added').closest('button')).toBeDisabled()
      })

      it('imports Global outcome to an Account', async () => {
        const {getByText, getAllByText} = render(<FindOutcomesModal {...defaultProps()} />, {
          contextType: 'Account',
          mocks: [
            ...findModalMocks(),
            ...groupMocks({groupId: '100'}),
            ...findOutcomesMocks({
              groupId: '300',
              isImported: false,
              contextType: 'Account',
              outcomesGroupContextId: null,
              outcomesGroupContextType: null,
              outcomesCount: 51
            }),
            ...importOutcomeMocks({
              outcomeId: '5',
              sourceContextId: null,
              sourceContextType: null
            })
          ]
        })
        await act(async () => jest.runAllTimers())
        await clickEl(getByText('Account Standards'))
        await clickEl(getByText('Root Account Outcome Group 0'))
        await clickEl(getByText('Group 100 folder 0'))
        const AddButton = getAllByText('Add')[0].closest('button')
        expect(AddButton).toBeEnabled()
        await clickEl(AddButton)
        expect(getByText('Added')).toBeInTheDocument()
        expect(getByText('Added').closest('button')).toBeDisabled()
      })

      it('displays flash alert with custom error message if outcome import fails', async () => {
        const {getByText, getAllByText} = render(<FindOutcomesModal {...defaultProps()} />, {
          contextType: 'Course',
          mocks: [
            ...courseImportMocks,
            ...importOutcomeMocks({
              outcomeId: '5',
              targetContextType: 'Course',
              sourceContextId: '1',
              sourceContextType: 'Account',
              failResponse: true
            })
          ]
        })
        await act(async () => jest.runAllTimers())
        await clickEl(getByText('Account Standards'))
        await clickEl(getByText('Root Account Outcome Group 0'))
        await clickEl(getByText('Group 100 folder 0'))
        await clickEl(getAllByText('Add')[0].closest('button'))
        expect(
          getAllByText(
            'An error occurred while importing this outcome: GraphQL error: Network error.'
          )[0]
        ).toBeInTheDocument()
      })

      it('displays flash alert with generic error message if outcome import fails and no error message', async () => {
        const {getByText, getAllByText} = render(<FindOutcomesModal {...defaultProps()} />, {
          contextType: 'Course',
          mocks: [
            ...courseImportMocks,
            ...importOutcomeMocks({
              outcomeId: '5',
              targetContextType: 'Course',
              sourceContextId: '1',
              sourceContextType: 'Account',
              failMutationNoErrMsg: true
            })
          ]
        })
        await act(async () => jest.runAllTimers())
        await clickEl(getByText('Account Standards'))
        await clickEl(getByText('Root Account Outcome Group 0'))
        await clickEl(getByText('Group 100 folder 0'))
        await clickEl(getAllByText('Add')[0].closest('button'))
        expect(
          getAllByText('An error occurred while importing this outcome.')[0]
        ).toBeInTheDocument()
      })
    })
  })

  describe('mobileView', () => {
    beforeEach(() => {
      isMobileView = true
    })
    itBehavesLikeAModal()
    itBehavesLikeATreeBrowser()

    it('renders the action drilldown', async () => {
      const {getByText} = render(<FindOutcomesModal {...defaultProps()} />)
      await act(async () => jest.runAllTimers())
      expect(getByText('Groups')).toBeInTheDocument()
    })

    it('does not render the TreeBrowser', async () => {
      const {queryByTestId} = render(<FindOutcomesModal {...defaultProps()} />)
      await act(async () => jest.runAllTimers())
      const treeBrowser = queryByTestId('groupsColumnRef')
      expect(treeBrowser).not.toBeInTheDocument()
    })

    it('does not render the list of outcomes until the action link is clicked', async () => {
      const {getByText, queryByText} = render(<FindOutcomesModal {...defaultProps()} />)
      await act(async () => jest.runAllTimers())
      await clickEl(queryByText('Groups'))
      fireEvent.click(getByText('Account Standards'))
      await clickEl(getByText('Root Account Outcome Group 0'))
      expect(queryByText('All Root Account Outcome Group 0 Outcomes')).not.toBeInTheDocument()
      await clickEl(getByText('View 0 Outcomes'))
      expect(getByText('All Root Account Outcome Group 0 Outcomes')).toBeInTheDocument()
    })

    it('renders the billboard until an action link is clicked', async () => {
      const {getByText, queryByText} = render(<FindOutcomesModal {...defaultProps()} />)
      await act(async () => jest.runAllTimers())
      await clickEl(queryByText('Groups'))
      fireEvent.click(getByText('Account Standards'))
      expect(getByText('Select a group to reveal outcomes here.')).toBeInTheDocument()
      await act(async () => jest.runAllTimers())
      await clickEl(getByText('Root Account Outcome Group 0'))
      fireEvent.click(getByText('View 0 Outcomes'))
      expect(queryByText('Select a group to reveal outcomes here.')).not.toBeInTheDocument()
    })

    it('unselects the selected group when the modal is closed', async () => {
      const {getByText, queryByText, rerender} = render(<FindOutcomesModal {...defaultProps()} />)
      await act(async () => jest.runAllTimers())
      await clickEl(queryByText('Groups'))
      fireEvent.click(getByText('Account Standards'))
      await clickEl(getByText('Root Account Outcome Group 0'))
      fireEvent.click(getByText('View 0 Outcomes'))
      render(<FindOutcomesModal {...defaultProps({open: false})} />, {renderer: rerender})
      render(<FindOutcomesModal {...defaultProps({open: true})} />, {renderer: rerender})
      expect(getByText('Select a group to reveal outcomes here.')).toBeInTheDocument()
    })
  })
})
