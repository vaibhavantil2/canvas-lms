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

import React, {useState, useEffect} from 'react'
import PropTypes from 'prop-types'
import I18n from 'i18n!OutcomeManagement'
import {TextInput} from '@instructure/ui-text-input'
import {TextArea} from '@instructure/ui-text-area'
import {Button} from '@instructure/ui-buttons'
import {View} from '@instructure/ui-view'
import {Text} from '@instructure/ui-text'
import {Flex} from '@instructure/ui-flex'
import {Mask} from '@instructure/ui-overlays'
import {ApplyTheme} from '@instructure/ui-themeable'
import Modal from '@canvas/instui-bindings/react/InstuiModal'
import useInput from '@canvas/outcomes/react/hooks/useInput'
import TargetGroupSelector from './shared/TargetGroupSelector'
import {titleValidator, displayNameValidator} from '../validators/outcomeValidators'
import {showFlashAlert} from '@canvas/alerts/react/FlashAlert'
import {
  CREATE_LEARNING_OUTCOME,
  SET_OUTCOME_FRIENDLY_DESCRIPTION_MUTATION
} from '@canvas/outcomes/graphql/Management'
import {useManageOutcomes} from '@canvas/outcomes/react/treeBrowser'
import useCanvasContext from '@canvas/outcomes/react/hooks/useCanvasContext'
import {useMutation} from 'react-apollo'
import OutcomesRceField from './shared/OutcomesRceField'

const CreateOutcomeModal = ({isOpen, onCloseHandler}) => {
  const {contextType, contextId, friendlyDescriptionFF, isMobileView} = useCanvasContext()
  const [title, titleChangeHandler] = useInput()
  const [displayName, displayNameChangeHandler] = useInput()
  const [friendlyDescription, friendlyDescriptionChangeHandler] = useInput()
  const [description, setDescription] = useState('')
  const [showTitleError, setShowTitleError] = useState(false)
  const [setOutcomeFriendlyDescription] = useMutation(SET_OUTCOME_FRIENDLY_DESCRIPTION_MUTATION)
  const [createLearningOutcome] = useMutation(CREATE_LEARNING_OUTCOME)
  const {rootId, collections} = useManageOutcomes('OutcomeManagementPanel')
  const [targetGroup, setTargetGroup] = useState(null)

  useEffect(() => {
    if (rootId && collections[rootId] && !targetGroup) {
      setTargetGroup(collections[rootId])
    }
  }, [collections, rootId, targetGroup])

  const invalidTitle = titleValidator(title)
  const invalidDisplayName = displayNameValidator(displayName)

  const changeTitle = event => {
    if (!showTitleError) setShowTitleError(true)
    titleChangeHandler(event)
  }

  const closeModal = () => {
    setShowTitleError(false)
    titleChangeHandler('')
    displayNameChangeHandler('')
    onCloseHandler()
  }

  const handleSetTargetGroup = ({targetGroup}) => {
    setTargetGroup(targetGroup)
  }

  const onCreateOutcomeHandler = () => {
    ;(async () => {
      try {
        const createLearningOutcomeResult = await createLearningOutcome({
          variables: {
            input: {
              groupId: targetGroup.id,
              title,
              displayName,
              description
            }
          }
        })

        const outcomeId =
          createLearningOutcomeResult.data?.createLearningOutcome?.learningOutcome?._id
        const errorMessage =
          createLearningOutcomeResult.data?.createLearningOutcome?.errors?.[0]?.message

        if (!outcomeId) throw new Error(errorMessage)

        if (friendlyDescriptionFF && friendlyDescription) {
          await setOutcomeFriendlyDescription({
            variables: {
              input: {
                outcomeId,
                description: friendlyDescription,
                contextId,
                contextType
              }
            }
          })
        }

        showFlashAlert({
          message: I18n.t('Outcome "%{title}" was successfully created.', {title}),
          type: 'success'
        })
      } catch (err) {
        showFlashAlert({
          message: err.message
            ? I18n.t('An error occurred while creating this outcome: %{message}.', {
                message: err.message
              })
            : I18n.t('An error occurred while creating this outcome.'),
          type: 'error'
        })
      }
    })()
    closeModal()
  }

  const titleInput = (
    <TextInput
      type="text"
      size="medium"
      value={title}
      placeholder={I18n.t('Enter name or code')}
      messages={invalidTitle && showTitleError ? [{text: invalidTitle, type: 'error'}] : []}
      renderLabel={I18n.t('Name')}
      onChange={changeTitle}
    />
  )

  const displayNameInput = (
    <TextInput
      type="text"
      size="medium"
      value={displayName}
      placeholder={I18n.t('Create a friendly display name')}
      messages={invalidDisplayName ? [{text: invalidDisplayName, type: 'error'}] : []}
      renderLabel={I18n.t('Friendly Name')}
      onChange={displayNameChangeHandler}
    />
  )

  return (
    <ApplyTheme theme={{[Mask.theme]: {zIndex: '1000'}}}>
      <Modal
        size={!isMobileView ? 'large' : 'fullscreen'}
        label={I18n.t('Create Outcome')}
        open={isOpen}
        shouldReturnFocus
        onDismiss={closeModal}
        shouldCloseOnDocumentClick={false}
      >
        <Modal.Body>
          {!isMobileView ? (
            <Flex as="div" alignItems="start" padding="small 0" height="7rem">
              <Flex.Item size="50%" padding="0 xx-small 0 0">
                {titleInput}
              </Flex.Item>
              <Flex.Item size="50%" padding="0 0 0 xx-small">
                {displayNameInput}
              </Flex.Item>
            </Flex>
          ) : (
            <>
              <View as="div" padding="small 0">
                {titleInput}
              </View>
              <View as="div" padding="small 0">
                {displayNameInput}
              </View>
            </>
          )}
          <View as="div" padding="small 0 0">
            <Text weight="bold">{I18n.t('Description')}</Text> <br />
            {isOpen && <OutcomesRceField onChangeHandler={setDescription} />}
          </View>
          {friendlyDescriptionFF && (
            <View as="div" padding="small 0">
              <TextArea
                size="medium"
                height="8rem"
                maxHeight="10rem"
                value={friendlyDescription}
                placeholder={I18n.t('Enter your friendly description here')}
                label={I18n.t('Friendly description (for parent/student display)')}
                onChange={friendlyDescriptionChangeHandler}
              />
            </View>
          )}
          <View as="div" padding="x-small 0 0">
            <Text size="medium" weight="bold">
              {isMobileView ? I18n.t('Select a location') : I18n.t('Location')}
            </Text>
            <TargetGroupSelector setTargetGroup={handleSetTargetGroup} />
          </View>
        </Modal.Body>
        <Modal.Footer>
          <Button type="button" color="secondary" margin="0 x-small 0 0" onClick={closeModal}>
            {I18n.t('Cancel')}
          </Button>
          <Button
            type="button"
            color="primary"
            margin="0 x-small 0 0"
            interaction={
              !invalidTitle && !invalidDisplayName && targetGroup ? 'enabled' : 'disabled'
            }
            onClick={onCreateOutcomeHandler}
          >
            {I18n.t('Create')}
          </Button>
        </Modal.Footer>
      </Modal>
    </ApplyTheme>
  )
}

CreateOutcomeModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onCloseHandler: PropTypes.func.isRequired
}

export default CreateOutcomeModal
