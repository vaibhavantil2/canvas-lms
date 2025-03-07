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

import {Alert} from '@instructure/ui-alerts'
import {BackButton} from '../../components/BackButton/BackButton'
import DateHelper from '@canvas/datetime/dateHelper'
import {Discussion} from '../../../graphql/Discussion'
import {DiscussionEntry} from '../../../graphql/DiscussionEntry'
import {Flex} from '@instructure/ui-flex'
import {Highlight} from '../../components/Highlight/Highlight'
import I18n from 'i18n!discussion_posts'
import {isTopicAuthor, responsiveQuerySizes} from '../../utils'
import {PostContainer} from '../PostContainer/PostContainer'
import PropTypes from 'prop-types'
import React, {useState} from 'react'
import {ReplyInfo} from '../../components/ReplyInfo/ReplyInfo'
import {Responsive} from '@instructure/ui-responsive'
import {Text} from '@instructure/ui-text'
import {ThreadActions} from '../../components/ThreadActions/ThreadActions'
import {ThreadingToolbar} from '../../components/ThreadingToolbar/ThreadingToolbar'
import {
  UPDATE_ISOLATED_VIEW_DEEPLY_NESTED_ALERT,
  UPDATE_DISCUSSION_THREAD_READ_STATE
} from '../../../graphql/Mutations'
import {useMutation, useApolloClient} from 'react-apollo'
import {View} from '@instructure/ui-view'

export const IsolatedParent = props => {
  const [updateIsolatedViewDeeplyNestedAlert] = useMutation(
    UPDATE_ISOLATED_VIEW_DEEPLY_NESTED_ALERT
  )

  const client = useApolloClient()
  const resetDiscussionCache = () => {
    client.resetStore()
  }

  const [updateDiscussionThreadReadState] = useMutation(UPDATE_DISCUSSION_THREAD_READ_STATE, {
    update: resetDiscussionCache
  })

  const [isEditing, setIsEditing] = useState(false)
  const threadActions = []

  if (props.discussionEntry.permissions.reply) {
    threadActions.push(
      <ThreadingToolbar.Reply
        key={`reply-${props.discussionEntry.id}`}
        authorName={props.discussionEntry.author.displayName}
        delimiterKey={`reply-delimiter-${props.discussionEntry._id}`}
        onClick={() => props.setRCEOpen(true)}
        isReadOnly={props.RCEOpen}
      />
    )
  }

  if (
    props.discussionEntry.permissions.viewRating &&
    (props.discussionEntry.permissions.rate || props.discussionEntry.ratingSum > 0)
  ) {
    threadActions.push(
      <ThreadingToolbar.Like
        key={`like-${props.discussionEntry.id}`}
        delimiterKey={`like-delimiter-${props.discussionEntry.id}`}
        onClick={() => {
          if (props.onToggleRating) {
            props.onToggleRating()
          }
        }}
        authorName={props.discussionEntry.author.displayName}
        isLiked={props.discussionEntry.rating}
        likeCount={props.discussionEntry.ratingSum || 0}
        interaction={props.discussionEntry.permissions.rate ? 'enabled' : 'disabled'}
      />
    )
  }

  if (props.discussionEntry.lastReply) {
    threadActions.push(
      <ThreadingToolbar.Expansion
        key={`expand-${props.discussionEntry.id}`}
        delimiterKey={`expand-delimiter-${props.discussionEntry.id}`}
        expandText={
          <ReplyInfo
            replyCount={props.discussionEntry.rootEntryParticipantCounts?.repliesCount}
            unreadCount={props.discussionEntry.rootEntryParticipantCounts?.unreadCount}
          />
        }
        isReadOnly={!props.RCEOpen}
        isExpanded={false}
        onClick={() => props.setRCEOpen(false)}
      />
    )
  }

  return (
    <Responsive
      match="media"
      query={responsiveQuerySizes({mobile: true, desktop: true})}
      props={{
        mobile: {
          textSize: 'small',
          padding: 'x-small'
        },
        desktop: {
          textSize: 'medium',
          padding: 'x-small medium'
        }
      }}
      render={responsiveProps => (
        <>
          {props.discussionEntry.parentId && (
            <View as="div" padding="small none none small">
              <BackButton
                onClick={() =>
                  props.onOpenIsolatedView(
                    props.discussionEntry.parentId,
                    props.discussionEntry.rootEntryId,
                    false
                  )
                }
              />
            </View>
          )}
          {props.discussionEntry.parentId && props.RCEOpen && ENV.should_show_deeply_nested_alert && (
            <Alert
              variant="warning"
              renderCloseButtonLabel="Close"
              margin="small"
              onDismiss={() => {
                updateIsolatedViewDeeplyNestedAlert({
                  variables: {
                    isolatedViewDeeplyNestedAlert: false
                  }
                })

                ENV.should_show_deeply_nested_alert = false
              }}
            >
              <Text size={responsiveProps.textSize}>
                {I18n.t(
                  'Deeply nested replies are no longer supported. Your reply will appear on the first page of this thread.'
                )}
              </Text>
            </Alert>
          )}
          <View as="div" padding={responsiveProps.padding}>
            <Highlight isHighlighted={props.isHighlighted}>
              <Flex padding="small">
                <Flex.Item shouldShrink shouldGrow>
                  <PostContainer
                    isTopic={false}
                    postUtilities={
                      <ThreadActions
                        id={props.discussionEntry.id}
                        isUnread={!props.discussionEntry.read}
                        onToggleUnread={props.onToggleUnread}
                        onDelete={props.discussionEntry.permissions?.delete ? props.onDelete : null}
                        onEdit={
                          props.discussionEntry.permissions?.update
                            ? () => {
                                setIsEditing(true)
                              }
                            : null
                        }
                        goToTopic={props.goToTopic}
                        onOpenInSpeedGrader={
                          props.discussionTopic.permissions?.speedGrader
                            ? props.onOpenInSpeedGrader
                            : null
                        }
                        onMarkThreadAsRead={readState =>
                          updateDiscussionThreadReadState({
                            variables: {
                              discussionEntryId: props.discussionEntry.rootEntryId
                                ? props.discussionEntry.rootEntryId
                                : props.discussionEntry.id,
                              read: readState
                            }
                          })
                        }
                      />
                    }
                    author={props.discussionEntry.author}
                    message={props.discussionEntry.message}
                    isEditing={isEditing}
                    onSave={message => {
                      if (props.onSave) {
                        props.onSave(props.discussionEntry, message)
                        setIsEditing(false)
                      }
                    }}
                    onCancel={() => setIsEditing(false)}
                    isIsolatedView
                    editor={props.discussionEntry.editor}
                    isUnread={!props.discussionEntry.read}
                    isForcedRead={props.discussionEntry.forcedReadState}
                    timingDisplay={DateHelper.formatDatetimeForDiscussions(
                      props.discussionEntry.createdAt
                    )}
                    editedTimingDisplay={DateHelper.formatDatetimeForDiscussions(
                      props.discussionEntry.updatedAt
                    )}
                    lastReplyAtDisplay={DateHelper.formatDatetimeForDiscussions(
                      props.discussionEntry.lastReply?.createdAt
                    )}
                    deleted={props.discussionEntry.deleted}
                    isTopicAuthor={isTopicAuthor(
                      props.discussionTopic.author,
                      props.discussionEntry.author
                    )}
                  >
                    {threadActions.length > 0 && (
                      <View as="div" padding="x-small none none">
                        <ThreadingToolbar discussionEntry={props.discussionEntry} isIsolatedView>
                          {threadActions}
                        </ThreadingToolbar>
                      </View>
                    )}
                  </PostContainer>
                </Flex.Item>
              </Flex>
              {props.children}
            </Highlight>
          </View>
        </>
      )}
    />
  )
}

IsolatedParent.propTypes = {
  discussionTopic: Discussion.shape,
  discussionEntry: DiscussionEntry.shape,
  onToggleUnread: PropTypes.func,
  onDelete: PropTypes.func,
  onOpenInSpeedGrader: PropTypes.func,
  onToggleRating: PropTypes.func,
  onSave: PropTypes.func,
  children: PropTypes.node,
  onOpenIsolatedView: PropTypes.func,
  RCEOpen: PropTypes.bool,
  setRCEOpen: PropTypes.func,
  isHighlighted: PropTypes.bool,
  goToTopic: PropTypes.func
}
