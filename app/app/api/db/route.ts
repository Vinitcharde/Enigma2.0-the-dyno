import { NextRequest, NextResponse } from 'next/server';
import {
  findUserByEmail, createUser, updateUser, getAllExperts, getExpertsByDomain,
  createBooking, getBookingsByExpert, getBookingsByStudent, updateBookingStatus, getBookingById,
  createNotification, getNotificationsByStudent, markNotificationRead,
  saveAISession, getAISessions, getAISessionStats,
  saveQuizAttempt, getQuizAttempts, getQuizStats,
  saveFeedback, getFeedbackByExpert, getExpertStats,
  logActivity, getRecentActivity,
  getStudentDashboardStats, getScoreTrend,
} from '@/lib/database';

// ── GET /api/db?action=...&param=... ────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const action = searchParams.get('action');

    switch (action) {
      // ── Users ──────────────────────────────────────────────
      case 'getUser': {
        const email = searchParams.get('email') || '';
        const user = await findUserByEmail(email);
        if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
        return NextResponse.json(user);
      }
      case 'getAllExperts': {
        const experts = await getAllExperts();
        return NextResponse.json(experts);
      }
      case 'getExpertsByDomain': {
        const domain = searchParams.get('domain') || '';
        const experts = await getExpertsByDomain(domain);
        return NextResponse.json(experts);
      }

      // ── Bookings ───────────────────────────────────────────
      case 'getBookingsByExpert': {
        const expertId = searchParams.get('expertId') || '';
        const bookings = (await getBookingsByExpert(expertId)).map(parseBooking);
        return NextResponse.json(bookings);
      }
      case 'getBookingsByStudent': {
        const email = searchParams.get('email') || '';
        const bookings = (await getBookingsByStudent(email)).map(parseBooking);
        return NextResponse.json(bookings);
      }
      case 'getBooking': {
        const id = searchParams.get('id') || '';
        const booking = await getBookingById(id);
        return NextResponse.json(booking ? parseBooking(booking) : null);
      }

      // ── Notifications ──────────────────────────────────────
      case 'getNotifications': {
        const email = searchParams.get('email') || '';
        const notifs = (await getNotificationsByStudent(email)).map(n => ({
          ...n,
          read: !!n.read,
          meetingLink: n.meeting_link,
          meetingRoom: n.meeting_room,
          studentEmail: n.student_email,
          expertName: n.expert_name,
          expertCompany: n.expert_company,
          createdAt: n.created_at,
        }));
        return NextResponse.json(notifs);
      }

      // ── AI Sessions ────────────────────────────────────────
      case 'getAISessions': {
        const email = searchParams.get('email') || '';
        const sessions = (await getAISessions(email)).map(s => ({
          ...s,
          createdAt: s.created_at,
        }));
        return NextResponse.json(sessions);
      }
      case 'getAISessionStats': {
        const email = searchParams.get('email') || '';
        return NextResponse.json(await getAISessionStats(email));
      }

      // ── Quiz ───────────────────────────────────────────────
      case 'getQuizAttempts': {
        const email = searchParams.get('email') || '';
        return NextResponse.json(await getQuizAttempts(email));
      }
      case 'getQuizStats': {
        const email = searchParams.get('email') || '';
        return NextResponse.json(await getQuizStats(email));
      }

      // ── Feedback ───────────────────────────────────────────
      case 'getFeedbackByExpert': {
        const expertId = searchParams.get('expertId') || '';
        return NextResponse.json(await getFeedbackByExpert(expertId));
      }
      case 'getExpertStats': {
        const expertId = searchParams.get('expertId') || '';
        return NextResponse.json(await getExpertStats(expertId));
      }

      // ── Activity ───────────────────────────────────────────
      case 'getRecentActivity': {
        const email = searchParams.get('email') || '';
        const limit = parseInt(searchParams.get('limit') || '10');
        return NextResponse.json(await getRecentActivity(email, limit));
      }

      // ── Dashboard Stats ────────────────────────────────────
      case 'getDashboardStats': {
        const email = searchParams.get('email') || '';
        return NextResponse.json(await getStudentDashboardStats(email));
      }
      case 'getScoreTrend': {
        const email = searchParams.get('email') || '';
        return NextResponse.json(await getScoreTrend(email));
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (err: any) {
    console.error('DB API GET error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ── POST /api/db ────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    switch (action) {
      // ── Auth ────────────────────────────────────────────────
      case 'login': {
        const { email, password } = body;
        const user = await findUserByEmail(email);
        if (!user) return NextResponse.json({ error: 'User not found' }, { status: 401 });
        if (user.password_hash !== password) return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
        return NextResponse.json(mapUserForFrontend(user));
      }
      case 'register': {
        const { id, email, password, name, role, college, company } = body;
        if (!email || !password || !name || !role) {
          return NextResponse.json({ error: 'Missing required fields (name, email, password, role).' }, { status: 400 });
        }
        const existing = await findUserByEmail(email);
        if (existing) return NextResponse.json({ error: 'Email already registered. Please sign in instead.' }, { status: 409 });
        await createUser({ id, email, password, name, role, college, company });
        const created = await findUserByEmail(email);
        if (!created) return NextResponse.json({ error: 'Account created but could not retrieve user. Please try logging in.' }, { status: 500 });
        return NextResponse.json(mapUserForFrontend(created));
      }
      case 'updateProfile': {
        const { email, data } = body;
        await updateUser(email, data);
        const updated = await findUserByEmail(email);
        return NextResponse.json(updated ? mapUserForFrontend(updated) : null);
      }

      // ── Bookings ───────────────────────────────────────────
      case 'createBooking': {
        await createBooking(body.booking);
        return NextResponse.json({ success: true });
      }
      case 'updateBookingStatus': {
        const { bookingId, status, meetingRoom, meetingLink } = body;
        await updateBookingStatus(bookingId, status, meetingRoom, meetingLink);
        return NextResponse.json({ success: true });
      }

      // ── Notifications ──────────────────────────────────────
      case 'createNotification': {
        await createNotification(body.notification);
        return NextResponse.json({ success: true });
      }
      case 'markNotificationRead': {
        await markNotificationRead(body.id);
        return NextResponse.json({ success: true });
      }

      // ── AI Sessions ────────────────────────────────────────
      case 'saveAISession': {
        await saveAISession(body.session);
        await logActivity({
          userEmail: body.session.userEmail,
          type: 'interview',
          title: `AI Interview — ${body.session.jobRole}`,
          detail: body.session.jobRole,
          score: `${body.session.overallScore}%`,
          icon: 'code',
          color: '#22d3ee',
        });
        return NextResponse.json({ success: true });
      }

      // ── Quiz ───────────────────────────────────────────────
      case 'saveQuizAttempt': {
        await saveQuizAttempt(body.attempt);
        await logActivity({
          userEmail: body.attempt.userEmail,
          type: 'quiz',
          title: `Completed ${body.attempt.section.charAt(0).toUpperCase() + body.attempt.section.slice(1)} Quiz`,
          detail: body.attempt.section,
          score: `${Math.round(body.attempt.accuracy)}%`,
          icon: 'book',
          color: '#a78bfa',
        });
        return NextResponse.json({ success: true });
      }

      // ── Feedback ───────────────────────────────────────────
      case 'saveFeedback': {
        await saveFeedback(body.feedback);
        return NextResponse.json({ success: true });
      }

      // ── Activity ───────────────────────────────────────────
      case 'logActivity': {
        await logActivity(body.entry);
        return NextResponse.json({ success: true });
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (err: any) {
    console.error('DB API POST error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ── Helpers ──────────────────────────────────────────────────────

function parseBooking(b: any) {
  return {
    ...b,
    // Supabase returns JSONB natively — no parsing needed
    weakAreas: b.weak_areas || [],
    aptitudeScores: b.aptitude_scores || {},
    studentName: b.student_name,
    studentEmail: b.student_email,
    expertId: b.expert_id,
    expertName: b.expert_name,
    expertCompany: b.expert_company,
    expertDesignation: b.expert_designation,
    expertAvatar: b.expert_avatar,
    expertColor: b.expert_color,
    aiScore: b.ai_score,
    meetingRoom: b.meeting_room,
    meetingLink: b.meeting_link,
    createdAt: b.created_at,
  };
}

function mapUserForFrontend(u: any) {
  if (!u) return null;
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role,
    avatar: u.avatar,
    college: u.college,
    company: u.company,
    skills: u.skills || [],
    targetRole: u.target_role,
    cgpa: u.cgpa,
    graduationYear: u.graduation_year,
    phone: u.phone,
    bio: u.bio,
    linkedin: u.linkedin,
    github: u.github,
  };
}
