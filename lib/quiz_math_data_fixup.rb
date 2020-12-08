# frozen_string_literal: true
#
# Copyright (C) 2020 - present Instructure, Inc.
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

module QuizMathDataFixup
  def fixup_quiz_questions_with_bad_math(quiz_or_bank, check_date: nil, question_bank: false)
    changed = false
    if question_bank
      questions = quiz_or_bank.assessment_questions
    else
      questions = quiz_or_bank.quiz_questions
    end
    questions = questions.where("updated_at>?", check_date) if check_date
    questions.find_each do |quiz_question|
      begin
        old_data = quiz_question.question_data.to_hash
        new_data = fixup_question_data(quiz_question.question_data.to_hash)
        quiz_question.write_attribute(:question_data, new_data) if new_data != old_data
        if quiz_question.changed?
          stat = question_bank ? 'updated_math_qb_question' : 'updated_math_question'
          InstStatsd::Statsd.increment(stat)
          changed = true
          quiz_question.save!
        end
      rescue => e
        Canvas::Errors.capture(e)
      end
    end
    qstat = question_bank ? 'updated_math_question_bank' : 'updated_math_quiz'
    InstStatsd::Statsd.increment(qstat) if changed
    quiz_or_bank
  end

  def fixup_submission_questions_with_bad_math(submission)
    submission.questions&.each_with_index do |question, index|
      begin
        data = fixup_question_data(question)
        submission.questions[index] = data
      rescue => e
        Canvas::Errors.capture(e)
      end
    end
    begin
      submission.save! if submission.changed?
    rescue => e
      Canvas::Errors.capture(e)
    end
  end

  def fixup_question_data(data)
    %i(neutral_comments_html correct_comments_html incorrect_comments_html).each do |key|
      if data[key].present?
        data[key] = fixup_html(data[key])
      end
    end
    data[:answers].each_with_index do |answer, index|
      %i(html comments_html).each { |key| answer[key] = fixup_html(answer[key]) if answer[key].present? }
      data[:answers][index] = answer
    end
    data
  end

  def fixup_html(html)
    return html unless html
    html = Nokogiri::HTML::DocumentFragment.parse(html)
    html.search('[id^="MathJax"]').each(&:remove)
    if html.children.length == 1 && html.children[0].node_type == Nokogiri::XML::Node::TEXT_NODE
      m = %r{equation_images\/([^\s]+)}.match(html.content)
      if m && m[1]
        code = URI.unescape(URI.unescape(m[1]))
        html =
          "<img class='equation_image' src='/equation_images/#{m[1]}' alt='LaTeX: #{
            code
          }' title='#{code} data-equation-content='#{code}>"
      end
      return html
    end
    html.search('.math_equation_latex').each do |latex|
      # find MathJax generated children, extract the eq's mathml
      # incase we need it later, then remove them
      mjnodes =
        html.search('[class^="MathJax"]')

      if mjnodes.length > 0
        n = mjnodes.filter('[data-mathml]')[0]
        mml = n.attribute('data-mathml') if n
        mjnodes.each(&:remove)
      end
      if (latex.content.length > 0)
        code = latex.content.gsub(/(^\\\(|\\\)$)/, '')
        escaped = URI.escape(URI.escape(code))
        latex.replace(
          "<img class='equation_image' src='/equation_images/#{escaped}' alt='LaTeX: #{
            code
          }' title='#{code}>"
        )
      elsif mml
        latex.replace(
          "<math xmlns='http://www.w3.org/1998/Math/MathML' class='math_equation_mml'>#{
            mml
          }</math>"
        )
      end
    end

    html.search('span.hidden-readable').each(&:remove)

    html.to_s
  end

  def check_or_fix_quizzes(batch_of_ids)
    Quizzes::Quiz.where(id: batch_of_ids).find_each { |q| fixup_quiz_questions_with_bad_math(q) }
  end

  def check_or_fix_question_banks(batch_of_ids)
    AssessmentQuestionBank.where(id: batch_of_ids).find_each { |q| fixup_quiz_questions_with_bad_math(q, question_bank: true) }
  end
end