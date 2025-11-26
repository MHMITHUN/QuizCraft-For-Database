import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import { Alert } from 'react-native';

class ReportingSystem {
  constructor() {
    this.reportTypes = {
      PERFORMANCE: 'performance',
      ATTENDANCE: 'attendance',
      TIME_ANALYTICS: 'time_analytics',
      ENGAGEMENT: 'engagement',
      PROGRESS: 'progress',
      COMPARISON: 'comparison',
      CUSTOM: 'custom'
    };

    this.exportFormats = {
      PDF: 'pdf',
      EXCEL: 'xlsx',
      CSV: 'csv',
      JSON: 'json'
    };

    this.dataFields = {
      // Student Information
      student_id: 'Student ID',
      student_name: 'Student Name',
      class: 'Class',
      grade: 'Grade',
      
      // Quiz Data
      quiz_title: 'Quiz Title',
      subject: 'Subject',
      difficulty: 'Difficulty',
      total_questions: 'Total Questions',
      correct_answers: 'Correct Answers',
      score: 'Score',
      percentage: 'Percentage',
      
      // Time Analytics
      time_taken: 'Time Taken',
      average_time_per_question: 'Avg Time/Question',
      time_spent_on_subject: 'Time on Subject',
      
      // Engagement Metrics
      quiz_attempts: 'Quiz Attempts',
      completion_rate: 'Completion Rate',
      streak_days: 'Streak Days',
      badges_earned: 'Badges Earned',
      
      // Performance Metrics
      improvement_rate: 'Improvement Rate',
      strong_topics: 'Strong Topics',
      weak_topics: 'Weak Topics',
      recommendations: 'Recommendations'
    };
  }

  // ========== CUSTOM REPORT BUILDER ==========
  async createCustomReport(reportConfig) {
    try {
      const report = {
        id: `report_${Date.now()}`,
        title: reportConfig.title || 'Custom Report',
        description: reportConfig.description || '',
        type: this.reportTypes.CUSTOM,
        
        // Report Configuration
        dateRange: reportConfig.dateRange || {
          start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          end: new Date().toISOString()
        },
        
        // Data Filters
        filters: {
          students: reportConfig.students || [], // specific students or 'all'
          classes: reportConfig.classes || [],
          subjects: reportConfig.subjects || [],
          quizTypes: reportConfig.quizTypes || [],
          difficultyLevels: reportConfig.difficultyLevels || []
        },
        
        // Selected Fields
        selectedFields: reportConfig.selectedFields || Object.keys(this.dataFields),
        
        // Grouping & Sorting
        groupBy: reportConfig.groupBy || null, // 'student', 'class', 'subject', 'date'
        sortBy: reportConfig.sortBy || 'student_name',
        sortOrder: reportConfig.sortOrder || 'asc',
        
        // Chart Configuration
        charts: reportConfig.charts || [],
        
        // Export Settings
        format: reportConfig.format || this.exportFormats.PDF,
        includeCharts: reportConfig.includeCharts !== false,
        
        createdAt: new Date().toISOString(),
        createdBy: reportConfig.createdBy || 'current_user'
      };

      // Generate report data
      const reportData = await this.generateReportData(report);
      
      // Save report configuration
      await this.saveReport(report);
      
      return {
        success: true,
        report,
        data: reportData,
        message: 'Custom report created successfully!'
      };

    } catch (error) {
      console.error('Error creating custom report:', error);
      throw error;
    }
  }

  async generateReportData(reportConfig) {
    try {
      // Fetch raw data based on filters
      const rawData = await this.fetchDataWithFilters(reportConfig.filters, reportConfig.dateRange);
      
      // Process and aggregate data
      const processedData = await this.processReportData(rawData, reportConfig);
      
      // Generate charts if requested
      const charts = reportConfig.includeCharts ? 
        await this.generateCharts(processedData, reportConfig.charts) : [];
      
      return {
        summary: this.generateSummary(processedData),
        details: processedData,
        charts,
        metadata: {
          totalRecords: processedData.length,
          dateRange: reportConfig.dateRange,
          generatedAt: new Date().toISOString()
        }
      };

    } catch (error) {
      console.error('Error generating report data:', error);
      throw error;
    }
  }

  async fetchDataWithFilters(filters, dateRange) {
    // Mock data generation for demonstration
    // In real implementation, this would query your database
    
    const mockData = [];
    const students = ['Alice Johnson', 'Bob Smith', 'Carol Davis', 'David Wilson', 'Emma Brown'];
    const subjects = ['Mathematics', 'Science', 'English', 'History', 'Geography'];
    const classes = ['Class 8A', 'Class 8B', 'Class 9A', 'Class 9B'];
    
    for (let i = 0; i < 100; i++) {
      const student = students[Math.floor(Math.random() * students.length)];
      const subject = subjects[Math.floor(Math.random() * subjects.length)];
      const classRoom = classes[Math.floor(Math.random() * classes.length)];
      
      mockData.push({
        student_id: `STD${1000 + i}`,
        student_name: student,
        class: classRoom,
        grade: classRoom.includes('8') ? 8 : 9,
        quiz_title: `${subject} Quiz ${Math.floor(Math.random() * 10) + 1}`,
        subject: subject,
        difficulty: ['Easy', 'Medium', 'Hard'][Math.floor(Math.random() * 3)],
        total_questions: 20,
        correct_answers: Math.floor(Math.random() * 20) + 1,
        score: Math.floor(Math.random() * 100) + 1,
        percentage: Math.floor(Math.random() * 100) + 1,
        time_taken: Math.floor(Math.random() * 1800) + 300, // 5-35 minutes
        average_time_per_question: Math.floor(Math.random() * 60) + 30, // 30-90 seconds
        time_spent_on_subject: Math.floor(Math.random() * 7200) + 1800, // 30min-2hours
        quiz_attempts: Math.floor(Math.random() * 10) + 1,
        completion_rate: Math.floor(Math.random() * 100) + 1,
        streak_days: Math.floor(Math.random() * 30) + 1,
        badges_earned: Math.floor(Math.random() * 5),
        improvement_rate: (Math.random() * 50 - 10).toFixed(1), // -10% to +40%
        strong_topics: ['Algebra', 'Geometry'][Math.floor(Math.random() * 2)],
        weak_topics: ['Trigonometry', 'Statistics'][Math.floor(Math.random() * 2)],
        date: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString()
      });
    }
    
    // Apply filters
    let filteredData = mockData;
    
    if (filters.students && filters.students.length > 0) {
      filteredData = filteredData.filter(item => filters.students.includes(item.student_id));
    }
    
    if (filters.classes && filters.classes.length > 0) {
      filteredData = filteredData.filter(item => filters.classes.includes(item.class));
    }
    
    if (filters.subjects && filters.subjects.length > 0) {
      filteredData = filteredData.filter(item => filters.subjects.includes(item.subject));
    }
    
    // Apply date range filter
    filteredData = filteredData.filter(item => {
      const itemDate = new Date(item.date);
      return itemDate >= new Date(dateRange.start) && itemDate <= new Date(dateRange.end);
    });
    
    return filteredData;
  }

  processReportData(rawData, reportConfig) {
    let processedData = [...rawData];
    
    // Filter selected fields
    processedData = processedData.map(item => {
      const filteredItem = {};
      reportConfig.selectedFields.forEach(field => {
        if (item[field] !== undefined) {
          filteredItem[field] = item[field];
        }
      });
      return filteredItem;
    });
    
    // Group data if specified
    if (reportConfig.groupBy) {
      processedData = this.groupDataBy(processedData, reportConfig.groupBy);
    }
    
    // Sort data
    processedData.sort((a, b) => {
      const aVal = a[reportConfig.sortBy];
      const bVal = b[reportConfig.sortBy];
      
      if (reportConfig.sortOrder === 'desc') {
        return bVal > aVal ? 1 : -1;
      }
      return aVal > bVal ? 1 : -1;
    });
    
    return processedData;
  }

  groupDataBy(data, groupBy) {
    const grouped = {};
    
    data.forEach(item => {
      const key = item[groupBy];
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(item);
    });
    
    return Object.entries(grouped).map(([key, items]) => ({
      group: key,
      items: items,
      count: items.length,
      averageScore: items.reduce((sum, item) => sum + (item.score || 0), 0) / items.length
    }));
  }

  generateSummary(data) {
    if (data.length === 0) return {};
    
    const scores = data.map(item => item.score || 0).filter(score => score > 0);
    const times = data.map(item => item.time_taken || 0).filter(time => time > 0);
    
    return {
      totalRecords: data.length,
      averageScore: scores.length > 0 ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2) : 0,
      highestScore: Math.max(...scores, 0),
      lowestScore: Math.min(...scores, 100),
      averageTime: times.length > 0 ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : 0,
      completionRate: data.filter(item => item.completion_rate > 80).length / data.length * 100
    };
  }

  async generateCharts(data, chartConfigs) {
    const charts = [];
    
    for (const config of chartConfigs) {
      try {
        const chartData = await this.generateChartData(data, config);
        charts.push(chartData);
      } catch (error) {
        console.error(`Error generating chart ${config.type}:`, error);
      }
    }
    
    return charts;
  }

  async generateChartData(data, config) {
    switch (config.type) {
      case 'bar':
        return this.generateBarChart(data, config);
      case 'line':
        return this.generateLineChart(data, config);
      case 'pie':
        return this.generatePieChart(data, config);
      default:
        return null;
    }
  }

  generateBarChart(data, config) {
    // Group data for bar chart
    const grouped = {};
    
    data.forEach(item => {
      const key = item[config.xAxis];
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(item[config.yAxis]);
    });
    
    return {
      type: 'bar',
      title: config.title || 'Bar Chart',
      labels: Object.keys(grouped),
      data: Object.values(grouped).map(values => 
        values.reduce((a, b) => a + b, 0) / values.length
      )
    };
  }

  generateLineChart(data, config) {
    // Sort data by date and create line chart
    const sortedData = data.sort((a, b) => new Date(a.date) - new Date(b.date));
    
    return {
      type: 'line',
      title: config.title || 'Line Chart',
      labels: sortedData.map(item => new Date(item.date).toLocaleDateString()),
      data: sortedData.map(item => item[config.yAxis])
    };
  }

  generatePieChart(data, config) {
    // Group data for pie chart
    const grouped = {};
    
    data.forEach(item => {
      const key = item[config.field];
      grouped[key] = (grouped[key] || 0) + 1;
    });
    
    return {
      type: 'pie',
      title: config.title || 'Pie Chart',
      labels: Object.keys(grouped),
      data: Object.values(grouped)
    };
  }

  // ========== ATTENDANCE TRACKING ==========
  async trackAttendance(attendanceData) {
    try {
      const attendance = {
        id: `attendance_${Date.now()}`,
        studentId: attendanceData.studentId,
        quizId: attendanceData.quizId,
        classId: attendanceData.classId,
        date: new Date().toISOString(),
        status: attendanceData.status, // 'present', 'absent', 'late'
        participationLevel: attendanceData.participationLevel || 'full', // 'full', 'partial', 'minimal'
        timeSpent: attendanceData.timeSpent || 0,
        questionsAnswered: attendanceData.questionsAnswered || 0,
        completionPercentage: attendanceData.completionPercentage || 0
      };

      await this.saveAttendance(attendance);
      
      return {
        success: true,
        attendance,
        message: 'Attendance tracked successfully'
      };

    } catch (error) {
      console.error('Error tracking attendance:', error);
      throw error;
    }
  }

  async generateAttendanceReport(filters) {
    try {
      const attendanceData = await this.getAttendanceData(filters);
      
      const report = {
        summary: {
          totalSessions: attendanceData.length,
          presentCount: attendanceData.filter(a => a.status === 'present').length,
          absentCount: attendanceData.filter(a => a.status === 'absent').length,
          lateCount: attendanceData.filter(a => a.status === 'late').length,
          averageParticipation: attendanceData.reduce((sum, a) => sum + a.completionPercentage, 0) / attendanceData.length
        },
        details: attendanceData,
        trends: this.calculateAttendanceTrends(attendanceData)
      };

      return report;

    } catch (error) {
      console.error('Error generating attendance report:', error);
      throw error;
    }
  }

  calculateAttendanceTrends(attendanceData) {
    const trends = {};
    
    // Group by week
    const weeklyData = {};
    attendanceData.forEach(item => {
      const week = this.getWeekNumber(new Date(item.date));
      if (!weeklyData[week]) {
        weeklyData[week] = [];
      }
      weeklyData[week].push(item);
    });
    
    // Calculate weekly attendance rates
    trends.weeklyRates = Object.entries(weeklyData).map(([week, data]) => ({
      week: parseInt(week),
      rate: data.filter(d => d.status === 'present').length / data.length * 100
    }));
    
    return trends;
  }

  // ========== TIME ANALYTICS ==========
  async generateTimeAnalytics(filters) {
    try {
      const timeData = await this.getTimeData(filters);
      
      const analytics = {
        overview: {
          totalTimeSpent: timeData.reduce((sum, item) => sum + item.time_spent, 0),
          averageSessionTime: timeData.reduce((sum, item) => sum + item.time_taken, 0) / timeData.length,
          mostActiveHour: this.findMostActiveHour(timeData),
          longestSession: Math.max(...timeData.map(item => item.time_taken)),
          shortestSession: Math.min(...timeData.map(item => item.time_taken))
        },
        
        subjectBreakdown: this.analyzeTimeBySubject(timeData),
        difficultyBreakdown: this.analyzeTimeByDifficulty(timeData),
        dailyPatterns: this.analyzeDailyPatterns(timeData),
        weeklyTrends: this.analyzeWeeklyTrends(timeData),
        
        recommendations: this.generateTimeRecommendations(timeData)
      };

      return {
        success: true,
        analytics,
        message: 'Time analytics generated successfully'
      };

    } catch (error) {
      console.error('Error generating time analytics:', error);
      throw error;
    }
  }

  analyzeTimeBySubject(timeData) {
    const subjectTimes = {};
    
    timeData.forEach(item => {
      const subject = item.subject;
      if (!subjectTimes[subject]) {
        subjectTimes[subject] = {
          totalTime: 0,
          sessionCount: 0,
          averageTime: 0
        };
      }
      
      subjectTimes[subject].totalTime += item.time_spent || 0;
      subjectTimes[subject].sessionCount += 1;
    });
    
    // Calculate averages
    Object.keys(subjectTimes).forEach(subject => {
      const data = subjectTimes[subject];
      data.averageTime = data.totalTime / data.sessionCount;
    });
    
    return subjectTimes;
  }

  analyzeTimeByDifficulty(timeData) {
    const difficultyTimes = {};
    
    timeData.forEach(item => {
      const difficulty = item.difficulty;
      if (!difficultyTimes[difficulty]) {
        difficultyTimes[difficulty] = {
          totalTime: 0,
          averageTime: 0,
          count: 0
        };
      }
      
      difficultyTimes[difficulty].totalTime += item.time_taken || 0;
      difficultyTimes[difficulty].count += 1;
    });
    
    Object.keys(difficultyTimes).forEach(difficulty => {
      const data = difficultyTimes[difficulty];
      data.averageTime = data.totalTime / data.count;
    });
    
    return difficultyTimes;
  }

  generateTimeRecommendations(timeData) {
    const recommendations = [];
    
    const avgTime = timeData.reduce((sum, item) => sum + item.time_taken, 0) / timeData.length;
    const longSessions = timeData.filter(item => item.time_taken > avgTime * 1.5);
    
    if (longSessions.length > timeData.length * 0.3) {
      recommendations.push({
        type: 'time_management',
        message: 'Consider shorter, more frequent study sessions for better retention',
        priority: 'medium'
      });
    }
    
    return recommendations;
  }

  // ========== EXPORT FUNCTIONS ==========
  async exportReport(reportId, format) {
    try {
      const report = await this.loadReport(reportId);
      if (!report) {
        throw new Error('Report not found');
      }

      const reportData = await this.generateReportData(report);
      
      switch (format) {
        case this.exportFormats.PDF:
          return await this.exportToPDF(report, reportData);
        case this.exportFormats.CSV:
          return await this.exportToCSV(report, reportData);
        case this.exportFormats.EXCEL:
          return await this.exportToExcel(report, reportData);
        case this.exportFormats.JSON:
          return await this.exportToJSON(report, reportData);
        default:
          throw new Error('Unsupported export format');
      }

    } catch (error) {
      console.error('Error exporting report:', error);
      throw error;
    }
  }

  async exportToPDF(report, reportData) {
    try {
      const htmlContent = this.generateHTMLReport(report, reportData);
      
      const { uri } = await Print.printToFileAsync({
        html: htmlContent,
        base64: false
      });

      const fileName = `${report.title.replace(/\s+/g, '_')}_${Date.now()}.pdf`;
      const newPath = `${FileSystem.documentDirectory}${fileName}`;
      
      await FileSystem.moveAsync({
        from: uri,
        to: newPath
      });

      return {
        success: true,
        uri: newPath,
        fileName,
        message: 'Report exported to PDF successfully'
      };

    } catch (error) {
      console.error('Error exporting to PDF:', error);
      throw error;
    }
  }

  async exportToCSV(report, reportData) {
    try {
      const csvContent = this.generateCSVContent(reportData.details);
      
      const fileName = `${report.title.replace(/\s+/g, '_')}_${Date.now()}.csv`;
      const filePath = `${FileSystem.documentDirectory}${fileName}`;
      
      await FileSystem.writeAsStringAsync(filePath, csvContent, {
        encoding: FileSystem.EncodingType.UTF8
      });

      return {
        success: true,
        uri: filePath,
        fileName,
        message: 'Report exported to CSV successfully'
      };

    } catch (error) {
      console.error('Error exporting to CSV:', error);
      throw error;
    }
  }

  async exportToJSON(report, reportData) {
    try {
      const jsonContent = JSON.stringify({
        report: report,
        data: reportData
      }, null, 2);
      
      const fileName = `${report.title.replace(/\s+/g, '_')}_${Date.now()}.json`;
      const filePath = `${FileSystem.documentDirectory}${fileName}`;
      
      await FileSystem.writeAsStringAsync(filePath, jsonContent, {
        encoding: FileSystem.EncodingType.UTF8
      });

      return {
        success: true,
        uri: filePath,
        fileName,
        message: 'Report exported to JSON successfully'
      };

    } catch (error) {
      console.error('Error exporting to JSON:', error);
      throw error;
    }
  }

  generateHTMLReport(report, reportData) {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <title>${report.title}</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; }
            .summary { background: #f5f5f5; padding: 15px; margin: 20px 0; border-radius: 5px; }
            .data-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            .data-table th, .data-table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            .data-table th { background-color: #4CAF50; color: white; }
            .chart-placeholder { background: #e9e9e9; height: 200px; margin: 20px 0; text-align: center; line-height: 200px; }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>${report.title}</h1>
            <p>${report.description}</p>
            <p>Generated on: ${new Date().toLocaleDateString()}</p>
        </div>
        
        <div class="summary">
            <h2>Summary</h2>
            <p>Total Records: ${reportData.summary.totalRecords}</p>
            <p>Average Score: ${reportData.summary.averageScore}%</p>
            <p>Highest Score: ${reportData.summary.highestScore}%</p>
            <p>Completion Rate: ${reportData.summary.completionRate.toFixed(2)}%</p>
        </div>
        
        <h2>Detailed Data</h2>
        <table class="data-table">
            <thead>
                <tr>
                    ${Object.keys(reportData.details[0] || {}).map(key => `<th>${this.dataFields[key] || key}</th>`).join('')}
                </tr>
            </thead>
            <tbody>
                ${reportData.details.map(row => `
                    <tr>
                        ${Object.values(row).map(value => `<td>${value}</td>`).join('')}
                    </tr>
                `).join('')}
            </tbody>
        </table>
    </body>
    </html>
    `;
  }

  generateCSVContent(data) {
    if (!data.length) return '';
    
    const headers = Object.keys(data[0]);
    const csvHeaders = headers.map(header => this.dataFields[header] || header).join(',');
    
    const csvRows = data.map(row => 
      headers.map(header => `"${row[header] || ''}"`).join(',')
    ).join('\n');
    
    return `${csvHeaders}\n${csvRows}`;
  }

  // ========== GRADEBOOK INTEGRATION ==========
  async syncWithGradebook(gradebookConfig) {
    try {
      // Mock gradebook sync
      const syncResult = {
        success: true,
        recordsSynced: 0,
        errors: [],
        lastSyncTime: new Date().toISOString()
      };

      // In real implementation, this would integrate with actual gradebook APIs
      
      return syncResult;

    } catch (error) {
      console.error('Error syncing with gradebook:', error);
      throw error;
    }
  }

  // ========== UTILITY METHODS ==========
  async saveReport(report) {
    const key = `report_${report.id}`;
    await AsyncStorage.setItem(key, JSON.stringify(report));
  }

  async loadReport(reportId) {
    const key = `report_${reportId}`;
    const stored = await AsyncStorage.getItem(key);
    return stored ? JSON.parse(stored) : null;
  }

  async saveAttendance(attendance) {
    const key = `attendance_${attendance.id}`;
    await AsyncStorage.setItem(key, JSON.stringify(attendance));
  }

  async getAttendanceData(filters) {
    // Mock implementation - would query real database
    return [];
  }

  async getTimeData(filters) {
    // Mock implementation - would query real database
    return [];
  }

  getWeekNumber(date) {
    const startDate = new Date(date.getFullYear(), 0, 1);
    const days = Math.floor((date - startDate) / (24 * 60 * 60 * 1000));
    return Math.ceil(days / 7);
  }

  findMostActiveHour(timeData) {
    const hourCounts = {};
    
    timeData.forEach(item => {
      const hour = new Date(item.date).getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });
    
    return Object.keys(hourCounts).reduce((a, b) => 
      hourCounts[a] > hourCounts[b] ? a : b
    );
  }

  analyzeDailyPatterns(timeData) {
    // Analyze daily usage patterns
    const dailyData = {};
    
    timeData.forEach(item => {
      const day = new Date(item.date).toLocaleDateString();
      if (!dailyData[day]) {
        dailyData[day] = {
          totalTime: 0,
          sessionCount: 0
        };
      }
      
      dailyData[day].totalTime += item.time_spent || 0;
      dailyData[day].sessionCount += 1;
    });
    
    return dailyData;
  }

  analyzeWeeklyTrends(timeData) {
    // Analyze weekly trends
    const weeklyData = {};
    
    timeData.forEach(item => {
      const week = this.getWeekNumber(new Date(item.date));
      if (!weeklyData[week]) {
        weeklyData[week] = {
          totalTime: 0,
          averageScore: 0,
          sessionCount: 0
        };
      }
      
      weeklyData[week].totalTime += item.time_spent || 0;
      weeklyData[week].averageScore += item.score || 0;
      weeklyData[week].sessionCount += 1;
    });
    
    // Calculate averages
    Object.keys(weeklyData).forEach(week => {
      const data = weeklyData[week];
      data.averageScore = data.averageScore / data.sessionCount;
    });
    
    return weeklyData;
  }

  async shareReport(reportUri) {
    try {
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(reportUri);
        return { success: true, message: 'Report shared successfully' };
      } else {
        throw new Error('Sharing is not available on this platform');
      }
    } catch (error) {
      console.error('Error sharing report:', error);
      throw error;
    }
  }
}

export const reportingSystem = new ReportingSystem();
export default reportingSystem;