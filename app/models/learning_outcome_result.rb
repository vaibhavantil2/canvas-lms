# frozen_string_literal: true

#
# Copyright (C) 2011 - present Instructure, Inc.
#
# This file is part of Canvas.
#
# Canvas is free software: you can redistribute it and/or modify it under
# the terms of the GNU Affero General Public License as published by the Free
# Software Foundation, version 3 of the License.
#
# Canvas is distributed in the hope that it will be useful, but WITHOUT ANY
# WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
# A PARTICULAR PURPOSE. See the GNU Affero General Public License for more
# details.
#
# You should have received a copy of the GNU Affero General Public License along
# with this program. If not, see <http://www.gnu.org/licenses/>.
#

class LearningOutcomeResult < ActiveRecord::Base
  include Canvas::SoftDeletable

  belongs_to :user
  belongs_to :learning_outcome
  belongs_to :alignment, :class_name => 'ContentTag', :foreign_key => :content_tag_id
  belongs_to :association_object, polymorphic:
      [:rubric_association, :assignment,
       { quiz: 'Quizzes::Quiz', assessment: 'LiveAssessments::Assessment' }],
      polymorphic_prefix: :association,
      foreign_type: :association_type, foreign_key: :association_id
  belongs_to :artifact, polymorphic:
      [:rubric_assessment, :submission,
       { quiz_submission: 'Quizzes::QuizSubmission', live_assessments_submission: 'LiveAssessments::Submission' }],
      polymorphic_prefix: true
  belongs_to :associated_asset, polymorphic:
      [:assessment_question, :assignment,
       { quiz: 'Quizzes::Quiz', assessment: 'LiveAssessments::Assessment' }],
      polymorphic_prefix: true
  belongs_to :context, polymorphic: [:course]
  belongs_to :root_account, class_name: 'Account'
  has_many :learning_outcome_question_results, dependent: :destroy
  simply_versioned

  before_save :infer_defaults
  before_save :ensure_user_uuid
  before_save :set_root_account_id

  def calculate_percent!
    scale_data = scale_params
    if needs_scale?(scale_data) && self.score && self.possible
      self.percent = calculate_by_scale(scale_data).round(4)
    elsif self.score
      self.percent = percentage
    end
    self.percent = nil if self.percent && !self.percent.to_f.finite?
  end

  def percentage
    if self.possible.to_f > 0
      self.score.to_f / self.possible.to_f
    elsif context&.root_account&.feature_enabled?(:account_level_mastery_scales) && outcome_proficiency.present? && outcome_proficiency.points_possible > 0
      self.score.to_f / outcome_proficiency.points_possible.to_f
    elsif parent_has_mastery?
      # the parent should always have a mastery score, if it doesn't
      # it means something is broken with the outcome and it will need to
      # be corrected. If percent is nil on an Outcome Result associated with
      # a Quiz, it will cause a 500 error on the learning mastery gradebook in
      # the get_aggregates method in RollupScoreAggregatorHelper
      self.score.to_f / parent_outcome.mastery_points.to_f
    end
  end

  def outcome_proficiency
    ## TODO: As part of OUT-3922, ensure a default is returned here
    @outcome_proficiency ||= context.resolved_outcome_proficiency
  end

  def assignment
    if self.association_object.is_a?(Assignment)
      self.association_object
    elsif self.artifact.is_a?(RubricAssessment)
      self.artifact.rubric_association.association_object
    elsif self.association_object.is_a? Quizzes::Quiz
      self.association_object.assignment
    else
      nil
    end
  end

  def save_to_version(attempt)
    InstStatsd::Statsd.increment('learning_outcome_result.create') if new_record?
    current_version = self.versions.current.try(:model)
    if current_version.try(:attempt) && attempt < current_version.attempt
      versions = self.versions.sort_by(&:created_at).reverse.select{|v| v.model.attempt == attempt}
      if !versions.empty?
        versions.each do |version|
          version_data = YAML::load(version.yaml)
          version_data["score"] = self.score
          version_data["mastery"] = self.mastery
          version_data["possible"] = self.possible
          version_data["attempt"] = self.attempt
          version_data["title"] = self.title
          version.yaml = version_data.to_yaml
          version.save
        end
      else
        save
      end
    else
      save
    end
  end

  def submitted_or_assessed_at
    submitted_at || assessed_at
  end

  scope :for_context_codes, lambda { |codes|
    if codes == 'all'
      all
    else
      where(:context_code => codes)
    end
  }
  scope :for_user, lambda { |user| where(:user_id => user) }
  scope :custom_ordering, lambda { |param|
    orders = {
      'recent' => {:assessed_at => :desc},
      'highest' => {:score => :desc},
      'oldest' => {:score => :asc},
      'default' => {:assessed_at => :desc}
    }
    order_clause = orders[param] || orders['default']
    order(order_clause)
  }
  scope :for_outcome_ids, lambda { |ids| where(:learning_outcome_id => ids) }
  scope :for_association, lambda { |association| where(:association_type => association.class.to_s, :association_id => association.id) }
  scope :for_associated_asset, lambda { |associated_asset| where(:associated_asset_type => associated_asset.class.to_s, :associated_asset_id => associated_asset.id) }
  scope :with_active_link, lambda { where("content_tags.workflow_state <> 'deleted'").joins(:alignment) }
  # rubocop:disable Layout/LineLength
  scope :exclude_muted_associations, -> {
    joins("LEFT JOIN #{RubricAssociation.quoted_table_name} rassoc ON rassoc.id = learning_outcome_results.association_id AND learning_outcome_results.association_type = 'RubricAssociation'").
      joins("LEFT JOIN #{Assignment.quoted_table_name} ra ON ra.id = rassoc.association_id AND rassoc.association_type = 'Assignment' AND rassoc.purpose = 'grading' AND rassoc.workflow_state = 'active'").
      joins("LEFT JOIN #{Quizzes::Quiz.quoted_table_name} ON quizzes.id = learning_outcome_results.association_id AND learning_outcome_results.association_type = 'Quizzes::Quiz'").
      joins("LEFT JOIN #{Assignment.quoted_table_name} qa ON qa.id = quizzes.assignment_id").
      joins("LEFT JOIN #{Assignment.quoted_table_name} sa ON sa.id = learning_outcome_results.association_id AND learning_outcome_results.association_type = 'Assignment'").
      joins("LEFT JOIN #{Submission.quoted_table_name} ON submissions.user_id = learning_outcome_results.user_id AND submissions.assignment_id in (ra.id, qa.id, sa.id)").
      joins("LEFT JOIN #{PostPolicy.quoted_table_name} pc on pc.assignment_id  in (ra.id, qa.id, sa.id)").
      where('(ra.id IS NULL AND qa.id IS NULL AND sa.id IS NULL)'\
            ' OR submissions.posted_at IS NOT NULL'\
            ' OR ra.grading_type = \'not_graded\''\
            ' OR qa.grading_type = \'not_graded\''\
            ' OR sa.grading_type = \'not_graded\''\
            ' OR pc.id IS NULL'\
            ' OR (pc.id IS NOT NULL AND pc.post_manually = False)')
  }
  # rubocop:enable Layout/LineLength

  private

  def infer_defaults
    self.learning_outcome_id = self.alignment.learning_outcome_id
    self.context_code = "#{self.context_type.underscore}_#{self.context_id}" rescue nil
    self.original_score ||= self.score
    self.original_possible ||= self.possible
    self.original_mastery = self.mastery if self.original_mastery == nil
    calculate_percent!
    true
  end

  def ensure_user_uuid
    self.user_uuid = self.user&.uuid if self.user_uuid.blank?
  end

  def set_root_account_id
    return if self.root_account_id.present?
    self.root_account_id = self.context&.resolved_root_account_id
  end

  def calculate_by_scale(scale_data)
    scale_percent = scale_data[:scale_percent]
    alignment_mastery = scale_data[:alignment_mastery]
    scale_points = (self.possible / scale_percent) - self.possible
    scale_cutoff = self.possible - (self.possible * alignment_mastery)
    percent_to_scale = (self.score + scale_cutoff) - self.possible
    if percent_to_scale > 0 && scale_cutoff > 0
      score_adjustment = (percent_to_scale / scale_cutoff) * scale_points
      scaled_score = self.score + score_adjustment
      (scaled_score / self.possible) * scale_percent
    else
      (self.score / self.possible) * scale_percent
    end
  end

  def scale_params
    parent_mastery = precise_mastery_percent
    alignment_mastery = self.alignment.mastery_score
    return unless parent_mastery && alignment_mastery
    if parent_mastery > 0 && alignment_mastery > 0
      { scale_percent: parent_mastery / alignment_mastery,
        alignment_mastery: alignment_mastery }
    end
  end

  def parent_has_mastery?
    parent_outcome&.mastery_points.to_f > 0
  end

  def parent_outcome
    self.learning_outcome
  end

  def needs_scale?(scale_data)
    scale_data && scale_data[:scale_percent] != 1.0
  end

  def precise_mastery_percent
    # the outcome's mastery percent is rounded to 2 places. This is normally OK
    # but for scaling it's too imprecise and can lead to inaccurate calculations
    if context&.root_account&.feature_enabled?(:account_level_mastery_scales) && outcome_proficiency.present?
      return unless outcome_proficiency.points_possible > 0 && outcome_proficiency.mastery_points > 0
      outcome_proficiency.mastery_points.to_f / outcome_proficiency.points_possible.to_f
    else
      return unless parent_has_mastery? && parent_outcome.points_possible > 0
      parent_outcome.mastery_points.to_f / parent_outcome.points_possible.to_f
    end
  end
end
