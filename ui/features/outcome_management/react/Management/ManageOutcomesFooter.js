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
import PropTypes from 'prop-types'
import {Flex} from '@instructure/ui-flex'
import {Button, IconButton} from '@instructure/ui-buttons'
import {IconOutcomesLine, IconTrashLine, IconMoveEndLine} from '@instructure/ui-icons'
import I18n from 'i18n!OutcomeManagement'
import OutcomesPopover from './OutcomesPopover'
import {outcomeShape} from './shapes'
import useCanvasContext from '@canvas/outcomes/react/hooks/useCanvasContext'

const ManageOutcomesFooter = ({
  selected,
  selectedCount,
  onRemoveHandler,
  onMoveHandler,
  onClearHandler
}) => {
  const {isMobileView} = useCanvasContext()
  const btnState = selectedCount > 0 ? 'enabled' : 'disabled'
  const moveButtonProps = {
    interaction: btnState,
    onClick: onMoveHandler,
    renderIcon: IconMoveEndLine
  }
  const deleteButtonProps = {
    interaction: btnState,
    onClick: onRemoveHandler,
    renderIcon: IconTrashLine
  }

  return (
    <Flex as="div" data-testid="manage-outcomes-footer">
      {!isMobileView && <Flex.Item as="div" width="34%" />}
      <Flex.Item as="div" width={isMobileView ? '100%' : '66%'}>
        <Flex
          justifyItems="space-between"
          wrap={isMobileView ? 'no-wrap' : 'wrap'}
          padding={isMobileView ? 'x-small 0 0' : '0'}
        >
          <Flex.Item>
            <Flex alignItems="center" padding="0 0 0 x-small">
              <Flex.Item as="div">
                <div
                  style={{
                    display: 'flex',
                    alignSelf: 'center',
                    fontSize: '0.875rem',
                    paddingLeft: isMobileView ? '0' : '0.75rem'
                  }}
                >
                  <IconOutcomesLine size="x-small" />
                </div>
              </Flex.Item>
              <Flex.Item as="div">
                <div style={{paddingLeft: isMobileView ? '.75rem' : '1.1875rem'}}>
                  <OutcomesPopover
                    outcomes={selected}
                    outcomeCount={selectedCount}
                    onClearHandler={onClearHandler}
                  />
                </div>
              </Flex.Item>
            </Flex>
          </Flex.Item>
          <Flex.Item as="div" padding={isMobileView ? '0' : '0 0 0 small'}>
            {isMobileView ? (
              <>
                <IconButton
                  margin="0 x-small"
                  screenReaderLabel={I18n.t('Move')}
                  {...moveButtonProps}
                />
                <IconButton
                  margin="0 x-small"
                  screenReaderLabel={I18n.t('Remove')}
                  {...deleteButtonProps}
                />
              </>
            ) : (
              <>
                <Button margin="x-small" {...deleteButtonProps}>
                  {I18n.t('Remove')}
                </Button>
                <Button margin="x-small" {...moveButtonProps}>
                  {I18n.t('Move')}
                </Button>
              </>
            )}
          </Flex.Item>
        </Flex>
      </Flex.Item>
    </Flex>
  )
}

ManageOutcomesFooter.propTypes = {
  selected: PropTypes.objectOf(outcomeShape).isRequired,
  selectedCount: PropTypes.number.isRequired,
  onRemoveHandler: PropTypes.func.isRequired,
  onMoveHandler: PropTypes.func.isRequired,
  onClearHandler: PropTypes.func.isRequired
}

export default ManageOutcomesFooter
