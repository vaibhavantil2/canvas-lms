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
import I18n from 'i18n!add_student_modal'
import React, {useRef, useState} from 'react'
import {Modal} from '@instructure/ui-modal'
import {CloseButton, Button} from '@instructure/ui-buttons'
import {Heading} from '@instructure/ui-heading'
import {Link} from '@instructure/ui-link'
import {View} from '@instructure/ui-view'
import PropTypes from 'prop-types'
import {Text} from '@instructure/ui-text'
import {TextInput} from '@instructure/ui-text-input'
import {ScreenReaderContent} from '@instructure/ui-a11y-content'
import doFetchApi from '@canvas/do-fetch-api-effect'
import {showFlashAlert} from '@canvas/alerts/react/FlashAlert'

const AddStudentModal = ({open, handleClose, currentUserId, onStudentPaired}) => {
  const pairingCodeInputRef = useRef(null)
  const [inputMessage, setInputMessage] = useState(null)
  const canvasGuideUrl =
    'https://community.canvaslms.com/t5/Student-Guide/How-do-I-generate-a-pairing-code-for-an-observer-as-a-student/ta-p/418'

  const textWithLink = texts =>
    texts.map((text, i) => (
      <View key={i} as="div" display="inline-block" padding="0 xx-small 0 0">
        {text}
      </View>
    ))

  const showError = error => {
    setInputMessage(error)
    setTimeout(() => {
      setInputMessage([])
    }, 10000)
  }

  const onSubmit = () => {
    const studentCode = pairingCodeInputRef.current.value
    if (studentCode) {
      submitCode(studentCode)
    } else {
      showError([{text: I18n.t('Please provide a pairing code.'), type: 'error'}])
    }
  }

  const submitCode = async studentCode => {
    try {
      const {response} = await doFetchApi({
        method: 'POST',
        path: `/api/v1/users/${currentUserId}/observees`,
        body: {pairing_code: studentCode}
      })
      showFlashAlert({
        message: I18n.t('Student paired successfully'),
        type: 'success'
      })
      if (response.ok) {
        onStudentPaired()
      }
      handleClose()
    } catch (ex) {
      showError([{text: I18n.t('Invalid pairing code.'), type: 'error'}])
      showFlashAlert({
        message: I18n.t('Failed pairing student.'),
        type: 'error'
      })
    }
  }

  return (
    <Modal
      open={open}
      onDismiss={handleClose}
      size="small"
      label={I18n.t('Pair with student')}
      shouldCloseOnDocumentClick
      theme={{smallMaxWidth: '27em'}}
    >
      <Modal.Header>
        <CloseButton
          placement="end"
          offset="small"
          onClick={handleClose}
          screenReaderLabel="Close"
        />
        <Heading>{I18n.t('Pair with student')}</Heading>
      </Modal.Header>
      <Modal.Body>
        <Text>{I18n.t('Enter a student pairing code below to add a student to observe.')}</Text>
        <View as="div" padding="small 0 x-small 0">
          <TextInput
            data-testid="pairing-code-input"
            messages={inputMessage}
            label={<ScreenReaderContent>{I18n.t('Pairing code')}</ScreenReaderContent>}
            inputRef={el => {
              pairingCodeInputRef.current = el
            }}
            placeholder={I18n.t('Pairing code')}
          />
        </View>
        {textWithLink([
          I18n.t('Visit'),
          <Link href={canvasGuideUrl}>{I18n.t('Canvas Guides')}</Link>,
          I18n.t('to learn more.')
        ])}
      </Modal.Body>
      <Modal.Footer>
        <Button data-testid="close-modal" onClick={handleClose} margin="0 x-small 0 0">
          {I18n.t('Close')}
        </Button>
        <Button data-testid="add-student-btn" onClick={onSubmit} color="primary">
          {I18n.t('Pair')}
        </Button>
      </Modal.Footer>
    </Modal>
  )
}

AddStudentModal.propTypes = {
  open: PropTypes.bool.isRequired,
  handleClose: PropTypes.func.isRequired,
  currentUserId: PropTypes.string.isRequired,
  onStudentPaired: PropTypes.func.isRequired
}

export default AddStudentModal
