import { Navigate, Route, Routes } from "react-router-dom";
import { api } from "@/adapters/http/api";
import { roleHome } from "@/constants/navigation";
import { RequireRole } from "./guards/RequireRole";
import { AdminWorkspace } from "@/features/admin";
import { AuthPage, ForgotPassword, LandingPage, ResetPassword } from "@/features/auth";
import { ChallengeFeedbackPage, ChallengePage, ActivityResultsPage, ScenarioActivityPage, ScenariosPage } from "@/features/activities";
import { LearnerClassroomsPage } from "@/features/classroom";
import { HelpPage, NotFoundPage } from "@/features/help";
import {
  AddStudentsPage, CreateClassroomPage, InstructorClassroomsPage, InstructorHomePage, LearnerDetailsPage, LearnersPage,
} from "@/features/instructor";
import { LessonViewerPage } from "@/features/lesson";
import { ProfileSetupPage } from "@/features/onboarding";
import { HomePage, LearningPathDetailsPage, LearningPathsPage } from "@/features/path";
import { PracticePage } from "@/features/practice";
import { ProfilePage, SettingsPage } from "@/features/profile";
import { ProgressPage } from "@/features/progress";
import { VocabularyPage } from "@/features/vocabulary";

export function PublicRoutes({ navigate, acceptAuth, onToast }) {
  const afterLogin = (account) => { acceptAuth(account); navigate(roleHome(account.role)); };
  const afterSignup = (account) => { acceptAuth(account); navigate("/profile/setup"); };
  return (
    <Routes>
      <Route path="/" element={<LandingPage onNavigate={navigate} onAuth={acceptAuth} onToast={onToast} />} />
      <Route path="/welcome" element={<LandingPage onNavigate={navigate} onAuth={acceptAuth} onToast={onToast} />} />
      <Route path="/login" element={<AuthPage mode="login" onAuth={afterLogin} onToast={onToast} />} />
      <Route path="/instructor/sign-in" element={<AuthPage mode="login" instructorMode onAuth={afterLogin} onToast={onToast} />} />
      <Route path="/signup" element={<AuthPage mode="signup" onAuth={afterSignup} onToast={onToast} />} />
      <Route path="/forgot-password" element={<ForgotPassword onToast={onToast} />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export function AuthedRoutes({ role, user, setUser, demoMode, settings, setSettings, savePreferences, navigate, acceptAuth, onToast }) {
  const afterLogin = (account) => { acceptAuth(account); navigate(roleHome(account.role)); };
  const afterSignup = (account) => { acceptAuth(account); navigate("/profile/setup"); };

  const saveProfile = async (details) => {
    try {
      const profile = await api("/profile", { method: "PUT", body: JSON.stringify(details) });
      setUser(profile.user);
      localStorage.setItem("talinturo-name", profile.user.name);
      onToast("Profile updated!");
    } catch (error) {
      onToast(`Couldn't update your profile: ${error.message}`);
    }
  };

  const finishSetup = async (profile) => {
    const result = await api("/profile", { method: "PUT", body: JSON.stringify({ name: user.name, ...profile }) });
    setUser(result.user);
    localStorage.setItem("talinturo-name", result.user.name);
    navigate("/");
  };

  return (
    <Routes>
      <Route path="/" element={role === "admin" ? <Navigate to="/admin" replace /> : <HomePage user={user} onNavigate={navigate} />} />
      <Route path="/admin" element={<RequireRole role={role} allow="admin"><AdminWorkspace user={user} /></RequireRole>} />

      {/* Learner */}
      <Route path="/paths" element={<LearningPathsPage onNavigate={navigate} />} />
      <Route path="/paths/:pathId/lessons/:lessonId" element={<LessonViewerPage onNavigate={navigate} />} />
      <Route path="/paths/:pathId" element={<LearningPathDetailsPage onNavigate={navigate} reducedMotion={settings.reducedMotion} />} />
      <Route path="/vocabulary" element={<VocabularyPage />} />
      <Route path="/practice" element={<PracticePage onToast={onToast} />} />
      <Route path="/scenarios" element={<ScenariosPage onNavigate={navigate} />} />
      <Route path="/activity" element={<Navigate to="/scenarios" replace />} />
      <Route path="/activity/:activityId" element={<ScenarioActivityPage onNavigate={navigate} />} />
      <Route path="/results" element={<ActivityResultsPage onNavigate={navigate} />} />
      <Route path="/challenge" element={<ChallengePage onNavigate={navigate} onToast={onToast} />} />
      <Route path="/challenge/success" element={<ChallengeFeedbackPage success onNavigate={navigate} />} />
      <Route path="/challenge/try-again" element={<ChallengeFeedbackPage onNavigate={navigate} />} />
      <Route path="/progress" element={<ProgressPage />} />

      {/* Instructor */}
      <Route path="/instructor" element={<RequireRole role={role} allow="instructor"><InstructorHomePage user={user} onNavigate={navigate} /></RequireRole>} />
      <Route path="/learners" element={<RequireRole role={role} allow="instructor"><LearnersPage onNavigate={navigate} /></RequireRole>} />
      <Route path="/learners/:id" element={<RequireRole role={role} allow="instructor"><LearnerDetailsPage /></RequireRole>} />
      <Route path="/classrooms" element={role === "instructor" ? <InstructorClassroomsPage onNavigate={navigate} /> : <LearnerClassroomsPage onToast={onToast} />} />
      <Route path="/classrooms/create" element={<RequireRole role={role} allow="instructor" fallback="/classrooms"><CreateClassroomPage onNavigate={navigate} onToast={onToast} /></RequireRole>} />
      <Route path="/classrooms/:id/students" element={<RequireRole role={role} allow="instructor" fallback="/classrooms"><AddStudentsPage onNavigate={navigate} onToast={onToast} demoMode={demoMode} /></RequireRole>} />

      {/* Shared */}
      <Route path="/profile" element={<ProfilePage user={user} onSave={saveProfile} />} />
      <Route path="/settings" element={<SettingsPage settings={settings} setSettings={setSettings} onSave={savePreferences} onToast={onToast} />} />
      <Route path="/help" element={<HelpPage />} />
      <Route path="/login" element={<AuthPage mode="login" onAuth={afterLogin} onToast={onToast} />} />
      <Route path="/instructor/sign-in" element={<Navigate to="/instructor" replace />} />
      <Route path="/signup" element={<AuthPage mode="signup" onAuth={afterSignup} onToast={onToast} />} />
      <Route path="/profile/setup" element={<ProfileSetupPage onDone={finishSetup} />} />
      <Route path="/forgot-password" element={<ForgotPassword onToast={onToast} />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/welcome" element={<Navigate to="/" replace />} />
      <Route path="*" element={<NotFoundPage onNavigate={navigate} />} />
    </Routes>
  );
}
