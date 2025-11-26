import AsyncStorage from '@react-native-async-storage/async-storage';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { Alert } from 'react-native';

WebBrowser.maybeCompleteAuthSession();

class IntegrationsSystem {
  constructor() {
    this.integrations = {
      GOOGLE_CLASSROOM: 'google_classroom',
      MICROSOFT_TEAMS: 'microsoft_teams',
      ZOOM: 'zoom',
      MOODLE: 'moodle',
      CANVAS: 'canvas',
      BLACKBOARD: 'blackboard',
      GOOGLE_CALENDAR: 'google_calendar',
      OUTLOOK_CALENDAR: 'outlook_calendar'
    };

    this.authStates = new Map();
    this.connectedServices = new Map();
    
    // OAuth configurations (these would be in environment variables in production)
    this.oauthConfigs = {
      google: {
        clientId: 'your-google-client-id',
        redirectUri: AuthSession.makeRedirectUri({ useProxy: true }),
        scopes: [
          'https://www.googleapis.com/auth/classroom.courses.readonly',
          'https://www.googleapis.com/auth/classroom.rosters.readonly',
          'https://www.googleapis.com/auth/classroom.coursework.students',
          'https://www.googleapis.com/auth/calendar'
        ],
        endpoints: {
          authorization: 'https://accounts.google.com/oauth/authorize',
          token: 'https://oauth2.googleapis.com/token',
          revoke: 'https://oauth2.googleapis.com/revoke'
        }
      },
      microsoft: {
        clientId: 'your-microsoft-client-id',
        redirectUri: AuthSession.makeRedirectUri({ useProxy: true }),
        scopes: [
          'https://graph.microsoft.com/Team.ReadBasic.All',
          'https://graph.microsoft.com/Channel.ReadBasic.All',
          'https://graph.microsoft.com/Files.Read.All',
          'https://graph.microsoft.com/Calendars.ReadWrite'
        ],
        endpoints: {
          authorization: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
          token: 'https://login.microsoftonline.com/common/oauth2/v2.0/token'
        }
      },
      zoom: {
        clientId: 'your-zoom-client-id',
        redirectUri: AuthSession.makeRedirectUri({ useProxy: true }),
        scopes: ['meeting:write', 'meeting:read', 'webinar:write', 'webinar:read'],
        endpoints: {
          authorization: 'https://zoom.us/oauth/authorize',
          token: 'https://zoom.us/oauth/token'
        }
      }
    };
  }

  // ========== GOOGLE CLASSROOM INTEGRATION ==========
  async connectGoogleClassroom() {
    try {
      const authResult = await this.authenticateWithGoogle();
      
      if (authResult.success) {
        const classrooms = await this.fetchGoogleClassrooms(authResult.accessToken);
        
        await this.saveIntegration(this.integrations.GOOGLE_CLASSROOM, {
          accessToken: authResult.accessToken,
          refreshToken: authResult.refreshToken,
          expiresAt: authResult.expiresAt,
          userEmail: authResult.userInfo.email,
          classrooms: classrooms,
          connectedAt: new Date().toISOString()
        });

        return {
          success: true,
          classrooms,
          message: 'Google Classroom connected successfully!'
        };
      }
      
      throw new Error('Authentication failed');

    } catch (error) {
      console.error('Error connecting Google Classroom:', error);
      throw error;
    }
  }

  async authenticateWithGoogle() {
    try {
      const request = new AuthSession.AuthRequest({
        clientId: this.oauthConfigs.google.clientId,
        scopes: this.oauthConfigs.google.scopes,
        redirectUri: this.oauthConfigs.google.redirectUri,
        responseType: AuthSession.ResponseType.Code,
        codeChallenge: AuthSession.AuthRequest.createCodeChallenge(),
        codeChallengeMethod: AuthSession.CodeChallengeMethod.S256
      });

      const result = await request.promptAsync({
        authorizationEndpoint: this.oauthConfigs.google.endpoints.authorization
      });

      if (result.type === 'success') {
        // Exchange code for tokens
        const tokenResponse = await this.exchangeCodeForTokens(
          result.params.code,
          this.oauthConfigs.google
        );
        
        // Get user info
        const userInfo = await this.getGoogleUserInfo(tokenResponse.access_token);
        
        return {
          success: true,
          accessToken: tokenResponse.access_token,
          refreshToken: tokenResponse.refresh_token,
          expiresAt: new Date(Date.now() + tokenResponse.expires_in * 1000).toISOString(),
          userInfo
        };
      }
      
      throw new Error('Authentication cancelled or failed');

    } catch (error) {
      console.error('Google authentication error:', error);
      throw error;
    }
  }

  async fetchGoogleClassrooms(accessToken) {
    try {
      const response = await fetch('https://classroom.googleapis.com/v1/courses', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch classrooms');
      }

      const data = await response.json();
      
      return data.courses?.map(course => ({
        id: course.id,
        name: course.name,
        section: course.section,
        description: course.description,
        room: course.room,
        ownerId: course.ownerId,
        creationTime: course.creationTime,
        updateTime: course.updateTime,
        enrollmentCode: course.enrollmentCode,
        courseState: course.courseState,
        alternateLink: course.alternateLink
      })) || [];

    } catch (error) {
      console.error('Error fetching Google Classrooms:', error);
      throw error;
    }
  }

  async createGoogleClassroomAssignment(classroomId, assignmentData) {
    try {
      const integration = await this.getIntegration(this.integrations.GOOGLE_CLASSROOM);
      if (!integration) {
        throw new Error('Google Classroom not connected');
      }

      const courseWork = {
        title: assignmentData.title,
        description: assignmentData.description,
        materials: [{
          link: {
            url: assignmentData.quizUrl,
            title: 'QuizCraft Quiz',
            thumbnailUrl: assignmentData.thumbnailUrl
          }
        }],
        workType: 'ASSIGNMENT',
        state: 'PUBLISHED',
        dueDate: assignmentData.dueDate ? {
          year: new Date(assignmentData.dueDate).getFullYear(),
          month: new Date(assignmentData.dueDate).getMonth() + 1,
          day: new Date(assignmentData.dueDate).getDate()
        } : undefined,
        dueTime: assignmentData.dueTime ? {
          hours: parseInt(assignmentData.dueTime.split(':')[0]),
          minutes: parseInt(assignmentData.dueTime.split(':')[1])
        } : undefined
      };

      const response = await fetch(
        `https://classroom.googleapis.com/v1/courses/${classroomId}/courseWork`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${integration.accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(courseWork)
        }
      );

      if (!response.ok) {
        throw new Error('Failed to create classroom assignment');
      }

      const assignment = await response.json();
      
      return {
        success: true,
        assignment: {
          id: assignment.id,
          title: assignment.title,
          alternateLink: assignment.alternateLink,
          creationTime: assignment.creationTime
        },
        message: 'Assignment created in Google Classroom!'
      };

    } catch (error) {
      console.error('Error creating Google Classroom assignment:', error);
      throw error;
    }
  }

  // ========== MICROSOFT TEAMS INTEGRATION ==========
  async connectMicrosoftTeams() {
    try {
      const authResult = await this.authenticateWithMicrosoft();
      
      if (authResult.success) {
        const teams = await this.fetchMicrosoftTeams(authResult.accessToken);
        
        await this.saveIntegration(this.integrations.MICROSOFT_TEAMS, {
          accessToken: authResult.accessToken,
          refreshToken: authResult.refreshToken,
          expiresAt: authResult.expiresAt,
          userEmail: authResult.userInfo.mail || authResult.userInfo.userPrincipalName,
          teams: teams,
          connectedAt: new Date().toISOString()
        });

        return {
          success: true,
          teams,
          message: 'Microsoft Teams connected successfully!'
        };
      }
      
      throw new Error('Authentication failed');

    } catch (error) {
      console.error('Error connecting Microsoft Teams:', error);
      throw error;
    }
  }

  async authenticateWithMicrosoft() {
    try {
      const request = new AuthSession.AuthRequest({
        clientId: this.oauthConfigs.microsoft.clientId,
        scopes: this.oauthConfigs.microsoft.scopes,
        redirectUri: this.oauthConfigs.microsoft.redirectUri,
        responseType: AuthSession.ResponseType.Code,
        prompt: AuthSession.Prompt.SelectAccount
      });

      const result = await request.promptAsync({
        authorizationEndpoint: this.oauthConfigs.microsoft.endpoints.authorization
      });

      if (result.type === 'success') {
        const tokenResponse = await this.exchangeCodeForTokens(
          result.params.code,
          this.oauthConfigs.microsoft
        );
        
        const userInfo = await this.getMicrosoftUserInfo(tokenResponse.access_token);
        
        return {
          success: true,
          accessToken: tokenResponse.access_token,
          refreshToken: tokenResponse.refresh_token,
          expiresAt: new Date(Date.now() + tokenResponse.expires_in * 1000).toISOString(),
          userInfo
        };
      }
      
      throw new Error('Authentication cancelled or failed');

    } catch (error) {
      console.error('Microsoft authentication error:', error);
      throw error;
    }
  }

  async fetchMicrosoftTeams(accessToken) {
    try {
      const response = await fetch('https://graph.microsoft.com/v1.0/me/joinedTeams', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch teams');
      }

      const data = await response.json();
      
      return data.value?.map(team => ({
        id: team.id,
        displayName: team.displayName,
        description: team.description,
        webUrl: team.webUrl,
        isArchived: team.isArchived,
        membershipType: team.membershipType
      })) || [];

    } catch (error) {
      console.error('Error fetching Microsoft Teams:', error);
      throw error;
    }
  }

  async postToMicrosoftTeams(teamId, channelId, message) {
    try {
      const integration = await this.getIntegration(this.integrations.MICROSOFT_TEAMS);
      if (!integration) {
        throw new Error('Microsoft Teams not connected');
      }

      const messageData = {
        body: {
          content: message.content,
          contentType: 'html'
        },
        attachments: message.attachments || []
      };

      const response = await fetch(
        `https://graph.microsoft.com/v1.0/teams/${teamId}/channels/${channelId}/messages`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${integration.accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(messageData)
        }
      );

      if (!response.ok) {
        throw new Error('Failed to post to Teams');
      }

      const result = await response.json();
      
      return {
        success: true,
        messageId: result.id,
        message: 'Posted to Microsoft Teams successfully!'
      };

    } catch (error) {
      console.error('Error posting to Microsoft Teams:', error);
      throw error;
    }
  }

  // ========== ZOOM INTEGRATION ==========
  async connectZoom() {
    try {
      const authResult = await this.authenticateWithZoom();
      
      if (authResult.success) {
        const userInfo = await this.getZoomUserInfo(authResult.accessToken);
        
        await this.saveIntegration(this.integrations.ZOOM, {
          accessToken: authResult.accessToken,
          refreshToken: authResult.refreshToken,
          expiresAt: authResult.expiresAt,
          userEmail: userInfo.email,
          userId: userInfo.id,
          connectedAt: new Date().toISOString()
        });

        return {
          success: true,
          userInfo,
          message: 'Zoom connected successfully!'
        };
      }
      
      throw new Error('Authentication failed');

    } catch (error) {
      console.error('Error connecting Zoom:', error);
      throw error;
    }
  }

  async authenticateWithZoom() {
    try {
      const request = new AuthSession.AuthRequest({
        clientId: this.oauthConfigs.zoom.clientId,
        scopes: this.oauthConfigs.zoom.scopes,
        redirectUri: this.oauthConfigs.zoom.redirectUri,
        responseType: AuthSession.ResponseType.Code
      });

      const result = await request.promptAsync({
        authorizationEndpoint: this.oauthConfigs.zoom.endpoints.authorization
      });

      if (result.type === 'success') {
        const tokenResponse = await this.exchangeCodeForTokens(
          result.params.code,
          this.oauthConfigs.zoom
        );
        
        return {
          success: true,
          accessToken: tokenResponse.access_token,
          refreshToken: tokenResponse.refresh_token,
          expiresAt: new Date(Date.now() + tokenResponse.expires_in * 1000).toISOString()
        };
      }
      
      throw new Error('Authentication cancelled or failed');

    } catch (error) {
      console.error('Zoom authentication error:', error);
      throw error;
    }
  }

  async createZoomMeeting(meetingData) {
    try {
      const integration = await this.getIntegration(this.integrations.ZOOM);
      if (!integration) {
        throw new Error('Zoom not connected');
      }

      const meeting = {
        topic: meetingData.topic || 'QuizCraft Quiz Session',
        type: 2, // Scheduled meeting
        start_time: meetingData.startTime,
        duration: meetingData.duration || 60,
        timezone: meetingData.timezone || 'UTC',
        agenda: meetingData.agenda || 'Interactive quiz session using QuizCraft',
        settings: {
          host_video: true,
          participant_video: true,
          join_before_host: false,
          mute_upon_entry: true,
          watermark: false,
          use_pmi: false,
          approval_type: 2,
          audio: 'both',
          auto_recording: 'none',
          enforce_login: false,
          waiting_room: true,
          breakout_room: {
            enable: true
          }
        }
      };

      const response = await fetch('https://api.zoom.us/v2/users/me/meetings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${integration.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(meeting)
      });

      if (!response.ok) {
        throw new Error('Failed to create Zoom meeting');
      }

      const meetingResult = await response.json();
      
      return {
        success: true,
        meeting: {
          id: meetingResult.id,
          topic: meetingResult.topic,
          joinUrl: meetingResult.join_url,
          startUrl: meetingResult.start_url,
          password: meetingResult.password,
          startTime: meetingResult.start_time
        },
        message: 'Zoom meeting created successfully!'
      };

    } catch (error) {
      console.error('Error creating Zoom meeting:', error);
      throw error;
    }
  }

  // ========== LMS INTEGRATIONS ==========
  async connectMoodle(moodleUrl, credentials) {
    try {
      // Moodle typically uses web services token authentication
      const tokenResponse = await fetch(`${moodleUrl}/login/token.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          username: credentials.username,
          password: credentials.password,
          service: 'moodle_mobile_app'
        })
      });

      if (!tokenResponse.ok) {
        throw new Error('Moodle authentication failed');
      }

      const tokenData = await tokenResponse.json();
      
      if (tokenData.error) {
        throw new Error(tokenData.error);
      }

      // Test the connection by getting user info
      const userInfo = await this.getMoodleUserInfo(moodleUrl, tokenData.token);
      
      await this.saveIntegration(this.integrations.MOODLE, {
        baseUrl: moodleUrl,
        token: tokenData.token,
        userId: userInfo.id,
        userEmail: userInfo.email,
        connectedAt: new Date().toISOString()
      });

      return {
        success: true,
        userInfo,
        message: 'Moodle connected successfully!'
      };

    } catch (error) {
      console.error('Error connecting Moodle:', error);
      throw error;
    }
  }

  async getMoodleUserInfo(baseUrl, token) {
    try {
      const response = await fetch(
        `${baseUrl}/webservice/rest/server.php?wstoken=${token}&wsfunction=core_webservice_get_site_info&moodlewsrestformat=json`
      );

      if (!response.ok) {
        throw new Error('Failed to get Moodle user info');
      }

      return await response.json();

    } catch (error) {
      console.error('Error getting Moodle user info:', error);
      throw error;
    }
  }

  async connectCanvas(canvasUrl, accessToken) {
    try {
      // Canvas uses API key authentication
      const userResponse = await fetch(`${canvasUrl}/api/v1/users/self`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!userResponse.ok) {
        throw new Error('Canvas authentication failed');
      }

      const userInfo = await userResponse.json();
      
      // Get user's courses
      const coursesResponse = await fetch(`${canvasUrl}/api/v1/courses`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      const courses = coursesResponse.ok ? await coursesResponse.json() : [];

      await this.saveIntegration(this.integrations.CANVAS, {
        baseUrl: canvasUrl,
        accessToken: accessToken,
        userId: userInfo.id,
        userEmail: userInfo.email,
        courses: courses.map(course => ({
          id: course.id,
          name: course.name,
          courseCode: course.course_code
        })),
        connectedAt: new Date().toISOString()
      });

      return {
        success: true,
        userInfo,
        courses,
        message: 'Canvas connected successfully!'
      };

    } catch (error) {
      console.error('Error connecting Canvas:', error);
      throw error;
    }
  }

  // ========== CALENDAR INTEGRATIONS ==========
  async syncWithGoogleCalendar(eventData) {
    try {
      const integration = await this.getIntegration(this.integrations.GOOGLE_CLASSROOM);
      if (!integration) {
        throw new Error('Google services not connected');
      }

      const event = {
        summary: eventData.title,
        description: eventData.description,
        start: {
          dateTime: eventData.startTime,
          timeZone: eventData.timezone || 'UTC'
        },
        end: {
          dateTime: eventData.endTime,
          timeZone: eventData.timezone || 'UTC'
        },
        attendees: eventData.attendees?.map(email => ({ email })) || [],
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'email', minutes: 24 * 60 },
            { method: 'popup', minutes: 30 }
          ]
        }
      };

      const response = await fetch(
        'https://www.googleapis.com/calendar/v3/calendars/primary/events',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${integration.accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(event)
        }
      );

      if (!response.ok) {
        throw new Error('Failed to create calendar event');
      }

      const calendarEvent = await response.json();
      
      return {
        success: true,
        event: {
          id: calendarEvent.id,
          htmlLink: calendarEvent.htmlLink,
          hangoutLink: calendarEvent.hangoutLink
        },
        message: 'Event added to Google Calendar!'
      };

    } catch (error) {
      console.error('Error syncing with Google Calendar:', error);
      throw error;
    }
  }

  async syncWithOutlookCalendar(eventData) {
    try {
      const integration = await this.getIntegration(this.integrations.MICROSOFT_TEAMS);
      if (!integration) {
        throw new Error('Microsoft services not connected');
      }

      const event = {
        subject: eventData.title,
        body: {
          contentType: 'HTML',
          content: eventData.description
        },
        start: {
          dateTime: eventData.startTime,
          timeZone: eventData.timezone || 'UTC'
        },
        end: {
          dateTime: eventData.endTime,
          timeZone: eventData.timezone || 'UTC'
        },
        attendees: eventData.attendees?.map(email => ({
          emailAddress: { address: email, name: email.split('@')[0] }
        })) || [],
        reminderMinutesBeforeStart: 30
      };

      const response = await fetch(
        'https://graph.microsoft.com/v1.0/me/events',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${integration.accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(event)
        }
      );

      if (!response.ok) {
        throw new Error('Failed to create Outlook calendar event');
      }

      const calendarEvent = await response.json();
      
      return {
        success: true,
        event: {
          id: calendarEvent.id,
          webLink: calendarEvent.webLink
        },
        message: 'Event added to Outlook Calendar!'
      };

    } catch (error) {
      console.error('Error syncing with Outlook Calendar:', error);
      throw error;
    }
  }

  // ========== UTILITY METHODS ==========
  async exchangeCodeForTokens(code, config) {
    try {
      const response = await fetch(config.endpoints.token, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          client_id: config.clientId,
          code: code,
          redirect_uri: config.redirectUri
        })
      });

      if (!response.ok) {
        throw new Error('Token exchange failed');
      }

      return await response.json();

    } catch (error) {
      console.error('Error exchanging code for tokens:', error);
      throw error;
    }
  }

  async getGoogleUserInfo(accessToken) {
    try {
      const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to get Google user info');
      }

      return await response.json();

    } catch (error) {
      console.error('Error getting Google user info:', error);
      throw error;
    }
  }

  async getMicrosoftUserInfo(accessToken) {
    try {
      const response = await fetch('https://graph.microsoft.com/v1.0/me', {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to get Microsoft user info');
      }

      return await response.json();

    } catch (error) {
      console.error('Error getting Microsoft user info:', error);
      throw error;
    }
  }

  async getZoomUserInfo(accessToken) {
    try {
      const response = await fetch('https://api.zoom.us/v2/users/me', {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to get Zoom user info');
      }

      return await response.json();

    } catch (error) {
      console.error('Error getting Zoom user info:', error);
      throw error;
    }
  }

  // ========== INTEGRATION MANAGEMENT ==========
  async saveIntegration(integrationType, data) {
    try {
      const key = `integration_${integrationType}`;
      await AsyncStorage.setItem(key, JSON.stringify(data));
      this.connectedServices.set(integrationType, data);
      
    } catch (error) {
      console.error('Error saving integration:', error);
      throw error;
    }
  }

  async getIntegration(integrationType) {
    try {
      // Check memory cache first
      if (this.connectedServices.has(integrationType)) {
        return this.connectedServices.get(integrationType);
      }

      // Load from storage
      const key = `integration_${integrationType}`;
      const stored = await AsyncStorage.getItem(key);
      
      if (stored) {
        const data = JSON.parse(stored);
        this.connectedServices.set(integrationType, data);
        return data;
      }

      return null;

    } catch (error) {
      console.error('Error getting integration:', error);
      return null;
    }
  }

  async disconnectIntegration(integrationType) {
    try {
      const integration = await this.getIntegration(integrationType);
      if (!integration) {
        throw new Error('Integration not found');
      }

      // Revoke tokens if possible
      if (integrationType === this.integrations.GOOGLE_CLASSROOM && integration.accessToken) {
        try {
          await fetch(
            `${this.oauthConfigs.google.endpoints.revoke}?token=${integration.accessToken}`,
            { method: 'POST' }
          );
        } catch (revokeError) {
          console.warn('Failed to revoke Google token:', revokeError);
        }
      }

      // Remove from storage and cache
      const key = `integration_${integrationType}`;
      await AsyncStorage.removeItem(key);
      this.connectedServices.delete(integrationType);

      return {
        success: true,
        message: `${integrationType} disconnected successfully`
      };

    } catch (error) {
      console.error('Error disconnecting integration:', error);
      throw error;
    }
  }

  async getAllConnectedIntegrations() {
    try {
      const integrations = {};
      
      for (const integrationType of Object.values(this.integrations)) {
        const integration = await this.getIntegration(integrationType);
        if (integration) {
          integrations[integrationType] = {
            connected: true,
            userEmail: integration.userEmail,
            connectedAt: integration.connectedAt,
            // Don't expose sensitive tokens
            hasValidToken: !!integration.accessToken
          };
        } else {
          integrations[integrationType] = {
            connected: false
          };
        }
      }
      
      return integrations;

    } catch (error) {
      console.error('Error getting connected integrations:', error);
      throw error;
    }
  }

  async refreshAccessToken(integrationType) {
    try {
      const integration = await this.getIntegration(integrationType);
      if (!integration || !integration.refreshToken) {
        throw new Error('No refresh token available');
      }

      let config;
      switch (integrationType) {
        case this.integrations.GOOGLE_CLASSROOM:
          config = this.oauthConfigs.google;
          break;
        case this.integrations.MICROSOFT_TEAMS:
          config = this.oauthConfigs.microsoft;
          break;
        case this.integrations.ZOOM:
          config = this.oauthConfigs.zoom;
          break;
        default:
          throw new Error('Unsupported integration type for token refresh');
      }

      const response = await fetch(config.endpoints.token, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          client_id: config.clientId,
          refresh_token: integration.refreshToken
        })
      });

      if (!response.ok) {
        throw new Error('Token refresh failed');
      }

      const tokenData = await response.json();
      
      // Update stored integration data
      const updatedIntegration = {
        ...integration,
        accessToken: tokenData.access_token,
        expiresAt: new Date(Date.now() + tokenData.expires_in * 1000).toISOString(),
        refreshToken: tokenData.refresh_token || integration.refreshToken,
        lastRefreshed: new Date().toISOString()
      };

      await this.saveIntegration(integrationType, updatedIntegration);

      return {
        success: true,
        message: 'Access token refreshed successfully'
      };

    } catch (error) {
      console.error('Error refreshing access token:', error);
      throw error;
    }
  }

  // ========== INTEGRATION HELPERS ==========
  async isIntegrationActive(integrationType) {
    try {
      const integration = await this.getIntegration(integrationType);
      if (!integration) {
        return false;
      }

      // Check if token is expired
      if (integration.expiresAt) {
        const expiresAt = new Date(integration.expiresAt);
        const now = new Date();
        
        if (now >= expiresAt) {
          // Try to refresh token
          try {
            await this.refreshAccessToken(integrationType);
            return true;
          } catch (refreshError) {
            return false;
          }
        }
      }

      return true;

    } catch (error) {
      console.error('Error checking integration status:', error);
      return false;
    }
  }

  getIntegrationDisplayName(integrationType) {
    const names = {
      [this.integrations.GOOGLE_CLASSROOM]: 'Google Classroom',
      [this.integrations.MICROSOFT_TEAMS]: 'Microsoft Teams',
      [this.integrations.ZOOM]: 'Zoom',
      [this.integrations.MOODLE]: 'Moodle',
      [this.integrations.CANVAS]: 'Canvas',
      [this.integrations.BLACKBOARD]: 'Blackboard',
      [this.integrations.GOOGLE_CALENDAR]: 'Google Calendar',
      [this.integrations.OUTLOOK_CALENDAR]: 'Outlook Calendar'
    };
    
    return names[integrationType] || integrationType;
  }

  getSupportedIntegrations() {
    return Object.entries(this.integrations).map(([key, value]) => ({
      key,
      value,
      displayName: this.getIntegrationDisplayName(value),
      category: this.getIntegrationCategory(value)
    }));
  }

  getIntegrationCategory(integrationType) {
    const categories = {
      [this.integrations.GOOGLE_CLASSROOM]: 'LMS',
      [this.integrations.MICROSOFT_TEAMS]: 'Communication',
      [this.integrations.ZOOM]: 'Video Conferencing',
      [this.integrations.MOODLE]: 'LMS',
      [this.integrations.CANVAS]: 'LMS',
      [this.integrations.BLACKBOARD]: 'LMS',
      [this.integrations.GOOGLE_CALENDAR]: 'Calendar',
      [this.integrations.OUTLOOK_CALENDAR]: 'Calendar'
    };
    
    return categories[integrationType] || 'Other';
  }
}

export const integrationsSystem = new IntegrationsSystem();
export default integrationsSystem;