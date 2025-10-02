// src/services/scoreCalculationService.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class ScoreCalculationService {
  /**
   * Calculate final score with all penalties
   * Penalties:
   * - Skipped tasks: 5% per task
   * - Late submissions: 10% penalty per late submission
   * - Submission time consistency: Bonus for consistent submissions
   */
  async calculateFinalScore(enrollmentId) {
    try {
      const enrollment = await prisma.enrollment.findUnique({
        where: { id: enrollmentId },
        include: {
          submissions: {
            include: {
              task: true
            },
            orderBy: {
              submissionDate: 'asc'
            }
          },
          internship: true
        }
      });

      if (!enrollment || !enrollment.submissions.length) {
        return {
          finalScore: 0,
          breakdown: {},
          eligible: false
        };
      }

      // Get all tasks for the internship
      const allTasks = await prisma.task.findMany({
        where: { internshipId: enrollment.internshipId },
        orderBy: { taskNumber: 'asc' }
      });

      const totalTasks = allTasks.length;
      const submittedTasks = enrollment.submissions.length;
      const skippedTasks = totalTasks - submittedTasks;

      // 1. Calculate base score from submissions
      let totalEarnedPoints = 0;
      let totalMaxPoints = 0;
      let lateSubmissions = 0;
      let submissionTimes = [];

      enrollment.submissions.forEach(submission => {
        const taskPoints = submission.task.points || 100;
        totalMaxPoints += taskPoints;
        totalEarnedPoints += submission.score || 0;
        
        if (submission.isLate) {
          lateSubmissions++;
        }

        submissionTimes.push({
          date: submission.submissionDate,
          taskNumber: submission.task.taskNumber
        });
      });

      // Add points for skipped tasks to max points
      const skippedTasksPoints = skippedTasks * 100; // Assuming 100 points per task
      totalMaxPoints += skippedTasksPoints;

      // Base percentage
      const basePercentage = totalMaxPoints > 0 
        ? (totalEarnedPoints / totalMaxPoints) * 100 
        : 0;

      // 2. Calculate penalties
      const skippedPenalty = skippedTasks * 5; // 5% per skipped task
      const latePenalty = lateSubmissions * 10; // 10% per late submission

      // 3. Calculate consistency bonus
      const consistencyBonus = this.calculateConsistencyBonus(submissionTimes);

      // 4. Final score calculation
      let finalScore = basePercentage - skippedPenalty - latePenalty + consistencyBonus;
      finalScore = Math.max(0, Math.min(100, finalScore)); // Clamp between 0-100

      // 5. Check eligibility
      const passPercentage = enrollment.internship.passPercentage || 75;
      const eligible = finalScore >= passPercentage && submittedTasks >= totalTasks;

      // 6. Create detailed breakdown
      const breakdown = {
        baseScore: Math.round(basePercentage * 100) / 100,
        earnedPoints: totalEarnedPoints,
        maxPoints: totalMaxPoints,
        totalTasks,
        submittedTasks,
        skippedTasks,
        penalties: {
          skipped: skippedPenalty,
          late: latePenalty,
          total: skippedPenalty + latePenalty
        },
        bonuses: {
          consistency: consistencyBonus
        },
        lateSubmissions,
        consistencyScore: this.calculateConsistencyScore(submissionTimes)
      };

      return {
        finalScore: Math.round(finalScore * 100) / 100,
        breakdown,
        eligible,
        passPercentage
      };

    } catch (error) {
      console.error('Calculate final score error:', error);
      throw error;
    }
  }

  /**
   * Calculate consistency bonus based on submission pattern
   * Rewards regular, timely submissions
   */
  calculateConsistencyBonus(submissionTimes) {
    if (submissionTimes.length < 3) {
      return 0; // Need at least 3 submissions for consistency
    }

    // Calculate intervals between submissions
    const intervals = [];
    for (let i = 1; i < submissionTimes.length; i++) {
      const interval = submissionTimes[i].date - submissionTimes[i - 1].date;
      const days = interval / (1000 * 60 * 60 * 24);
      intervals.push(days);
    }

    // Calculate standard deviation of intervals
    const mean = intervals.reduce((sum, val) => sum + val, 0) / intervals.length;
    const variance = intervals.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / intervals.length;
    const stdDev = Math.sqrt(variance);

    // Lower standard deviation = more consistent = higher bonus
    // Max bonus: 5% for very consistent submissions
    const maxBonus = 5;
    const consistencyScore = Math.max(0, 1 - (stdDev / 7)); // 7 days as reference
    const bonus = consistencyScore * maxBonus;

    return Math.round(bonus * 100) / 100;
  }

  /**
   * Calculate consistency score (0-100)
   */
  calculateConsistencyScore(submissionTimes) {
    if (submissionTimes.length < 2) {
      return 0;
    }

    const intervals = [];
    for (let i = 1; i < submissionTimes.length; i++) {
      const interval = submissionTimes[i].date - submissionTimes[i - 1].date;
      const days = interval / (1000 * 60 * 60 * 24);
      intervals.push(days);
    }

    const mean = intervals.reduce((sum, val) => sum + val, 0) / intervals.length;
    const variance = intervals.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / intervals.length;
    const stdDev = Math.sqrt(variance);

    // Convert to 0-100 scale
    const score = Math.max(0, 100 - (stdDev * 10));
    return Math.round(score);
  }

  /**
   * Calculate performance metrics for intern
   */
  async calculatePerformanceMetrics(enrollmentId) {
    try {
      const scoreData = await this.calculateFinalScore(enrollmentId);
      const enrollment = await prisma.enrollment.findUnique({
        where: { id: enrollmentId },
        include: {
          submissions: {
            include: {
              task: true
            }
          }
        }
      });

      // Calculate average submission time
      const avgSubmissionTime = this.calculateAverageSubmissionTime(
        enrollment.submissions
      );

      // Calculate task completion rate
      const allTasks = await prisma.task.count({
        where: { internshipId: enrollment.internshipId }
      });
      const completionRate = (enrollment.submissions.length / allTasks) * 100;

      // Calculate quality score (based on admin ratings)
      const qualityScore = this.calculateQualityScore(enrollment.submissions);

      return {
        ...scoreData,
        metrics: {
          completionRate: Math.round(completionRate),
          avgSubmissionTime,
          qualityScore,
          totalSubmissions: enrollment.submissions.length,
          approvedSubmissions: enrollment.submissions.filter(
            s => s.status === 'APPROVED'
          ).length,
          rejectedSubmissions: enrollment.submissions.filter(
            s => s.status === 'REJECTED'
          ).length
        }
      };

    } catch (error) {
      console.error('Calculate performance metrics error:', error);
      throw error;
    }
  }

  /**
   * Calculate average submission time (hours before deadline)
   */
  calculateAverageSubmissionTime(submissions) {
    if (!submissions.length) return 0;

    const times = submissions.map(sub => {
      // Assuming 24-hour deadline per task
      // Calculate hours before deadline
      return sub.isLate ? -1 : 12; // Simplified
    });

    const avg = times.reduce((sum, t) => sum + t, 0) / times.length;
    return Math.round(avg * 10) / 10;
  }

  /**
   * Calculate quality score based on admin feedback and scores
   */
  calculateQualityScore(submissions) {
    if (!submissions.length) return 0;

    const approvedSubmissions = submissions.filter(s => s.status === 'APPROVED');
    if (!approvedSubmissions.length) return 0;

    const avgScore = approvedSubmissions.reduce(
      (sum, sub) => sum + (sub.score || 0), 0
    ) / approvedSubmissions.length;

    return Math.round(avgScore);
  }

  /**
   * Update enrollment with calculated score
   */
  async updateEnrollmentScore(enrollmentId) {
    try {
      const scoreData = await this.calculateFinalScore(enrollmentId);

      await prisma.enrollment.update({
        where: { id: enrollmentId },
        data: {
          finalScore: scoreData.finalScore,
          certificateEligible: scoreData.eligible,
          updatedAt: new Date()
        }
      });

      return scoreData;

    } catch (error) {
      console.error('Update enrollment score error:', error);
      throw error;
    }
  }

  /**
   * Get leaderboard with scores
   */
  async getLeaderboard(internshipId = null, limit = 10) {
    try {
      const where = {
        isCompleted: true,
        finalScore: { not: null }
      };

      if (internshipId) {
        where.internshipId = internshipId;
      }

      const enrollments = await prisma.enrollment.findMany({
        where,
        orderBy: { finalScore: 'desc' },
        take: limit,
        include: {
          intern: {
            select: {
              id: true,
              userId: true,
              name: true
            }
          },
          internship: {
            select: {
              title: true
            }
          }
        }
      });

      return enrollments.map((enrollment, index) => ({
        rank: index + 1,
        intern: enrollment.intern,
        internship: enrollment.internship.title,
        finalScore: enrollment.finalScore,
        completionDate: enrollment.completionDate,
        certificateIssued: enrollment.certificatePurchased
      }));

    } catch (error) {
      console.error('Get leaderboard error:', error);
      throw error;
    }
  }
}

module.exports = new ScoreCalculationService();