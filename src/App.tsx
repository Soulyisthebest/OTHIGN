import React, { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import { 
  BookOpen, Award, Compass, Briefcase, MessageSquare, 
  Home, Train, Map, Globe, FileText, CheckCircle, 
  AlertTriangle, ChevronRight, ChevronLeft, User, 
  Copy, Plus, Search, Building, Check, HelpCircle, 
  Activity, Flame, Volume2, ArrowRight, CheckSquare, Sparkles
} from "lucide-react";
import { 
  LANGUAGES, NAV_ITEMS, ROADMAP_STEPS, VISA_DATA, 
  FORMATIONS, TRANSPORT, LOGEMENT, ALPHABET_DATA, 
  LEVEL_TOPICS, STUDENT_CITIES_GUIDE
} from "./data";
import { CV_TEMPLATES } from "./cvTemplates";
import { HUNDRED_QUESTIONS, CAREER_CATEGORIES } from "./questionsData";
import { jsPDF } from "jspdf";
import { getFallbackLessonData } from "./fallbackLessons";
import { getFallbackExam } from "./fallbackExams";
import { getSpecialtyDetails } from "./specialtyDetails";
import { AdminDashboard } from "./components/AdminDashboard";

export default function App() {
  // --- Portal Gate Access & Real-Time Sync States ---
  const [userRole, setUserRole] = useState<"student" | "admin" | null>(() => {
    return localStorage.getItem("sp_user_role") as any || null;
  });
  const [loggedInEmail, setLoggedInEmail] = useState<string>(() => {
    return localStorage.getItem("sp_logged_email") || "";
  });
  const [loggedStudent, setLoggedStudent] = useState<any | null>(null);

  // Form input controllers
  const [studentNameInput, setStudentNameInput] = useState("");
  const [studentLastNameInput, setStudentLastNameInput] = useState("");
  const [studentPhoneInput, setStudentPhoneInput] = useState("");
  const [studentEmailInput, setStudentEmailInput] = useState("");
  const [studentCountryInput, setStudentCountryInput] = useState("Morocco");
  const [studentGenderInput, setStudentGenderInput] = useState("Femenino");
  const [studentGoalInput, setStudentGoalInput] = useState("FP Grado Superior");
  const [studentSpanishLevelInput, setStudentSpanishLevelInput] = useState("A1");
  const [studentAgeInput, setStudentAgeInput] = useState("20");
  const [studentCurrentEduInput, setStudentCurrentEduInput] = useState("Bachillerato");
  const [studentCurrentCityInput, setStudentCurrentCityInput] = useState("");
  const [studentTargetCityInput, setStudentTargetCityInput] = useState("Madrid");
  const [studentCurrentCountryInput, setStudentCurrentCountryInput] = useState("Morocco");

  const [adminEmailInput, setAdminEmailInput] = useState("");
  const [adminPasswordInput, setAdminPasswordInput] = useState("");

  const [authError, setAuthError] = useState("");
  const [dbStats, setDbStats] = useState<any>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [activePortalTab, setActivePortalTab] = useState<"student" | "creator">("student");

  // --- Persistent Local Profile State ---
  const [profile, setProfile] = useState(() => {
    const saved = localStorage.getItem("sp_student_profile");
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return {
      country: "morocco",
      goal: "FP Grado Superior",
      xp: 0,
      streak: 3,
      level: "A1",
      lives: 10,
      lastLivesRefill: new Date().toDateString(),
      passedExamsForLevel: {} as Record<string, number>,
      passedExams_v2: [] as string[],
      levelLocked: false
    };
  });

  useEffect(() => {
    localStorage.setItem("sp_student_profile", JSON.stringify(profile));
  }, [profile]);

  // --- Real-time Stats Refetcher & Student Database Sync ---
  const fetchStats = async () => {
    setLoadingStats(true);
    try {
      const res = await fetch("/api/db/stats");
      if (res.ok) {
        const data = await res.json();
        setDbStats(data);
        
        if (localStorage.getItem("sp_user_role") === "student" && localStorage.getItem("sp_logged_email")) {
          const matchingEmail = localStorage.getItem("sp_logged_email") || "";
          const matched = data.students.find((s: any) => s.email.toLowerCase() === matchingEmail.toLowerCase());
          if (matched) {
            setLoggedStudent(matched);
            setProfile({
              country: matched.country.toLowerCase(),
              goal: matched.academicGoal,
              xp: matched.xp,
              streak: matched.streak || 3,
              level: matched.level,
              lives: matched.lives !== undefined ? matched.lives : 10,
              lastLivesRefill: matched.lastLivesRefill || new Date().toDateString(),
              passedExams_v2: matched.passedExams_v2 || [],
              passedExamsForLevel: matched.passedExamsForLevel || {},
              levelLocked: matched.levelLocked || false
            });
          }
        }
      }
    } catch (e) {
      console.error("Error fetching admin stats:", e);
    } finally {
      setLoadingStats(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [userRole, loggedInEmail]);

  useEffect(() => {
    if (dbStats && dbStats.communityMessages && dbStats.communityMessages.length > 0) {
      setChats(dbStats.communityMessages);
    }
  }, [dbStats]);

  const syncStudentUpdate = async (updates: any) => {
    if (userRole !== "student" || !loggedStudent) return;
    try {
      const res = await fetch("/api/student/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: loggedStudent.id,
          updates
        })
      });
      if (res.ok) {
        const data = await res.json();
        setLoggedStudent(data.student);
      }
    } catch (e) {
      console.error("Error backing up student XP / level update on database:", e);
    }
  };

  useEffect(() => {
    if (userRole === "student" && loggedStudent) {
      const dbCountry = loggedStudent.country.toLowerCase();
      const dbGoal = loggedStudent.academicGoal;
      const dbXp = loggedStudent.xp;
      const dbLevel = loggedStudent.level;

      if (profile.country !== dbCountry || profile.goal !== dbGoal || profile.xp !== dbXp || profile.level !== dbLevel) {
        syncStudentUpdate({
          country: profile.country,
          academicGoal: profile.goal,
          xp: profile.xp,
          level: profile.level,
          lives: profile.lives,
          lastLivesRefill: profile.lastLivesRefill,
          passedExams_v2: profile.passedExams_v2,
          passedExamsForLevel: profile.passedExamsForLevel
        });
      }
    }
  }, [profile]);

  // Auth Portal actions
  const handleStudentLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    
    if (!studentEmailInput.trim()) {
      setAuthError("Por favor ingrese un correo válido de estudiante.");
      return;
    }

    if (!studentNameInput.trim() || !studentLastNameInput.trim()) {
      setAuthError("Por favor ingrese su nombre completo y apellido.");
      return;
    }

    const phoneCleaned = studentPhoneInput.trim().replace(/[\s-()]/g, "");
    const phoneRegex = /^\+?\d{8,15}$/;
    if (!studentPhoneInput.trim()) {
      setAuthError("Por favor ingrese su número de teléfono.");
      return;
    }
    if (!phoneRegex.test(phoneCleaned)) {
      setAuthError("Formato de número de teléfono incorrecto. Debe incluir prefijo y entre 8 y 15 dígitos (ej: +212612345678 o +34612345678).");
      return;
    }

    if (!studentCurrentCityInput.trim()) {
      setAuthError("Por favor ingrese la ciudad donde reside actualmente.");
      return;
    }

    try {
      const res = await fetch("/api/auth/student-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: studentEmailInput.trim(),
          name: studentNameInput.trim() || "Estudiante",
          lastName: studentLastNameInput.trim(),
          phone: studentPhoneInput.trim(),
          country: studentCountryInput,
          gender: studentGenderInput,
          academicGoal: studentGoalInput,
          spanishLevel: studentSpanishLevelInput,
          age: Number(studentAgeInput) || 20,
          currentEducation: studentCurrentEduInput,
          city: studentCurrentCityInput.trim(),
          targetCity: studentTargetCityInput,
          currentCountry: studentCurrentCountryInput
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        localStorage.setItem("sp_user_role", "student");
        localStorage.setItem("sp_logged_email", data.student.email);
        setUserRole("student");
        setLoggedInEmail(data.student.email);
        setLoggedStudent(data.student);
        setProfile({
          country: data.student.country.toLowerCase(),
          goal: data.student.academicGoal,
          xp: data.student.xp,
          streak: data.student.streak || 3,
          level: data.student.level,
          lives: data.student.lives !== undefined ? data.student.lives : 10,
          lastLivesRefill: data.student.lastLivesRefill || new Date().toDateString(),
          passedExams_v2: data.student.passedExams_v2 || [],
          passedExamsForLevel: data.student.passedExamsForLevel || {},
          levelLocked: data.student.levelLocked || false
        });
      } else {
        setAuthError(data.error || "Fallo en el inicio de sesión del alumno.");
      }
    } catch (err: any) {
      setAuthError("La base de datos remota no está lista o se rechazó la conexión.");
    }
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    if (!adminEmailInput.trim() || !adminPasswordInput.trim()) {
      setAuthError("Ingrese el correo administrativo y contraseña.");
      return;
    }
    if (adminEmailInput.trim().toLowerCase() === "soullis8@gmail.com" && adminPasswordInput === "Sullivanem123") {
      localStorage.setItem("sp_user_role", "admin");
      localStorage.setItem("sp_logged_email", "soullis8@gmail.com");
      setUserRole("admin");
      setLoggedInEmail("soullis8@gmail.com");
    } else {
      setAuthError("Acceso denegado.");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("sp_user_role");
    localStorage.removeItem("sp_logged_email");
    setUserRole(null);
    setLoggedInEmail("");
    setLoggedStudent(null);
    setAuthError("");
  };

  // --- Active Tab and Languages ---
  const [lang, setLang] = useState<string>("fr");
  const [tab, setTab] = useState<string>("roadmap");
  const [visaCountry, setVisaCountry] = useState<string>("morocco");
  const [formationTab, setFormationTab] = useState<string>("fp_superior");
  const [selectedCityLife, setSelectedCityLife] = useState<string>("Madrid");

  // --- Search state inside sections ---
  const [transportSearch, setTransportSearch] = useState<string>("");
  const [formationsSearch, setFormationsSearch] = useState<string>("");
  const [selectedSpecialty, setSelectedSpecialty] = useState<any | null>(null);

  // --- Book Lesson States ---
  const [selectedLevel, setSelectedLevel] = useState<string>("A1");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [lessonData, setLessonData] = useState<any>(null);
  const [loadingLesson, setLoadingLesson] = useState<boolean>(false);
  const [isOfflineMode, setIsOfflineMode] = useState<boolean>(false);
  
  // Exercise assessment answers
  const [exAnswers, setExAnswers] = useState<Record<number, any>>({});
  const [exResults, setExResults] = useState<Record<number, { ok: boolean; fb: string }>>({});

  // --- Level Advancement Exam States ---
  const [examActive, setExamActive] = useState<boolean>(false);
  const [selectedExamId, setSelectedExamId] = useState<number>(1);
  const [loadingExam, setLoadingExam] = useState<boolean>(false);
  const [examData, setExamData] = useState<any>(null);
  const [examAnswers, setExamAnswers] = useState<Record<number, number>>({});
  const [examSubmitted, setExamSubmitted] = useState<boolean>(false);
  const [examScore, setExamScore] = useState<number>(0);
  const [examPassed, setExamPassed] = useState<boolean>(false);
  const [activeTarea, setActiveTarea] = useState<number>(1);

  // --- CV Generator States ---
  const [cvData, setCvData] = useState({
    name: "Ahmed Al-Mansoori",
    email: "ahmed.mansoori@gmail.com",
    role: "Desarrollador Web Full Stack Junior",
    city: "Madrid, España",
    edu: "Grado Superior en Desarrollo de Aplicaciones Web (DAW) / BootCamp FullStack",
    skills: "HTML5, CSS3, JavaScript, React, Node.js, Git, SQL, Español (A2), Árabe (Nativo), Inglés (B2)",
    exp: "Desarrollo de portfolio de aplicaciones responsivas utilizando React y Tailwind. Prácticas en proyectos colaborativos en GitHub y resolución de incidencias frontend."
  });
  const [cvHtml, setCvHtml] = useState<string>("");
  const [cvGenerating, setCvGenerating] = useState<boolean>(false);
  const [cvCopied, setCvCopied] = useState<boolean>(false);

  // --- 100-Question Career Quiz States ---
  const [quizActive, setQuizActive] = useState<boolean>(false);
  const [quizIndex, setQuizIndex] = useState<number>(0);
  const [quizAnswers, setQuizAnswers] = useState<number[]>(() => Array(100).fill(-1));

  // --- Interactive roadmap completion state ---
  const [completedSteps, setCompletedSteps] = useState<number[]>(() => {
    const saved = localStorage.getItem("sp_roadmap_completed");
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return [1, 2];
  });

  useEffect(() => {
    localStorage.setItem("sp_roadmap_completed", JSON.stringify(completedSteps));
  }, [completedSteps]);

  // --- Community Chat States ---
  const [chats, setChats] = useState<Array<{ id: string; user: string; text: string; time: string; system?: boolean }>>([
    { id: "1", user: "Youssef_ma", text: "¡Hola! ¿Alguien ha solicitado el visado en Rabat recientemente?", time: "11:20 am" },
    { id: "2", user: "Sofia_es", text: "Hola Youssef, sí, la cita previa suele tardar unos 10 días en aparecer. ¡Organízate bien!", time: "11:22 am" },
    { id: "3", user: "Profesor de España 🤖", text: "💡 CONSEJO PRÁCTICO: Asegúrate de que tu seguro médico privado tenga cobertura del 100% repatración y sea 'sin copago'.", time: "11:23 am", system: true }
  ]);
  const [chatInp, setChatInp] = useState<string>("");
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // --- Text-to-Speech ---
  const speakSpanish = (text: string) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "es-ES";
    utterance.rate = 0.85;
    
    const voices = window.speechSynthesis.getVoices();
    const esVoice = voices.find(v => v.lang.toLowerCase().includes("es-es")) || 
                    voices.find(v => v.lang.toLowerCase().startsWith("es"));
    if (esVoice) utterance.voice = esVoice;
    window.speechSynthesis.speak(utterance);
  };

  const t = (item: any) => {
    if (!item) return "";
    if (typeof item === "object") {
      return item[lang] || item["en"] || Object.values(item)[0] || "";
    }
    return item;
  };

  const getMinPage = (lvl: string) => {
    return ["A1", "A2", "B1", "B2", "C1", "C2"].indexOf(lvl) * 50 + 1;
  };

  const getMaxPage = (lvl: string) => {
    return (["A1", "A2", "B1", "B2", "C1", "C2"].indexOf(lvl) + 1) * 50;
  };

  const getTopic = (lvl: string, page: number) => {
    const topics = LEVEL_TOPICS[lvl] || LEVEL_TOPICS.A1;
    const minP = getMinPage(lvl);
    const index = (page - minP) % topics.length;
    return topics[index >= 0 ? index : 0];
  };

  // Load Lesson Data
  const handleLoadLesson = async (lvl: string, pageNum: number) => {
    setLoadingLesson(true);
    setExAnswers({});
    setExResults({});
    const topic = getTopic(lvl, pageNum);

    try {
      const response = await fetch("/api/lesson", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          level: lvl,
          page: pageNum,
          topic: topic,
          targetLang: LANGUAGES.find(l => l.code === lang)?.label || "English"
        })
      });
      if (response.ok) {
        const data = await response.json();
        setLessonData(data);
        setIsOfflineMode(false);
      } else {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 429 || errorData.isQuota) {
          setIsOfflineMode(true);
        }
        throw new Error("Failed to consult lesson api");
      }
    } catch (e) {
      const fallback = getFallbackLessonData(lvl, topic, lang);
      setLessonData(fallback);
      setIsOfflineMode(true);
    } finally {
      setLoadingLesson(false);
    }
  };

  // Load Level advancement exam
  const handleLoadExam = async (examId: number) => {
    setSelectedExamId(examId);
    setLoadingExam(true);
    setExamData(null);
    setExamAnswers({});
    setExamSubmitted(false);
    setActiveTarea(1);
 
    try {
      const response = await fetch("/api/exam", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          level: selectedLevel,
          examId: examId,
          targetLang: LANGUAGES.find(l => l.code === lang)?.label || "English"
        })
      });
      if (response.ok) {
        const data = await response.json();
        setExamData(data);
        setIsOfflineMode(false);
      } else {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 429 || errorData.isQuota) {
          setIsOfflineMode(true);
        }
        throw new Error("Exam API down");
      }
    } catch (e) {
      setExamData(getFallbackExam(selectedLevel, examId, lang));
      setIsOfflineMode(true);
    } finally {
      setLoadingExam(false);
    }
  };

  // Generate European-standard Spanish CV
  const handleGenerateCV = async () => {
    setCvGenerating(true);
    setCvHtml("");

    try {
      const response = await fetch("/api/cv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cvData)
      });
      if (response.ok) {
        const result = await response.json();
        setCvHtml(result.cvHtml);
      } else {
        throw new Error("CV creation service failed");
      }
    } catch (e) {
      setCvHtml(`
        <div style="font-family: sans-serif; color: #1e293b; max-width: 600px; padding: 20px; background: white; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
          <h2 style="margin: 0 0 5px 0; color: #1e3a8a; font-size: 24px;">${cvData.name}</h2>
          <p style="margin: 0; color: #64748b; font-size: 13px;">Email: ${cvData.email} | Ciudad: ${cvData.city}</p>
          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 15px 0;">
          <h3 style="color: #1e3a8a; font-size: 15px; margin-bottom: 5px;">OBJETIVO PROFESIONAL</h3>
          <p style="font-size: 12px; line-height: 1.5; color: #334155;">Joven con motivación para incorporarse al mercado laboral español en el cargo de: <strong>${cvData.role}</strong>.</p>
          <h3 style="color: #1e3a8a; font-size: 15px; margin-bottom: 5px; margin-top: 15px;">FORMACIÓN ACADÉMICA</h3>
          <p style="font-size: 12px; margin: 0; color: #334155;"><strong>${cvData.edu}</strong></p>
          <h3 style="color: #1e3a8a; font-size: 15px; margin-bottom: 5px; margin-top: 15px;">COMPETENCIAS Y APTITUDES</h3>
          <p style="font-size: 12px; color: #334155; line-height: 1.5;">${cvData.skills}</p>
          <h3 style="color: #1e3a8a; font-size: 15px; margin-bottom: 5px; margin-top: 15px;">EXPERIENCIA PROFESIONAL</h3>
          <p style="font-size: 12px; color: #334155; line-height: 1.5;">${cvData.exp}</p>
        </div>
      `);
    } finally {
      setCvGenerating(false);
    }
  };

  const handleDownloadCVPDF = () => {
    try {
      const doc = new jsPDF();
      doc.setFillColor(255, 255, 255);
      doc.rect(0, 0, 210, 297, "F");
      
      doc.setFillColor(30, 58, 138);
      doc.rect(0, 0, 210, 48, "F");
      
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(22);
      doc.text((cvData.name || "Ejemplo Ficticio").toUpperCase(), 15, 22);
      
      doc.setTextColor(245, 158, 11);
      doc.setFontSize(11);
      doc.text((cvData.role || "Puesto Objetivo").toUpperCase(), 15, 30);
      
      doc.setTextColor(230, 230, 230);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text(`Contacto: ${cvData.email || "ejemplo@ficticio.com"}  |  Ciudad: ${cvData.city || "Madrid"}  |  Modelo de Referencia Ficticio`, 15, 38);
      
      let y = 60;
      doc.setTextColor(30, 58, 138);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text("PERFIL PROFESIONAL", 15, y);
      
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.5);
      doc.line(15, y + 2, 195, y + 2);
      y += 8;
      
      doc.setTextColor(50, 50, 50);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      const perfilText = `Joven con motivación para incorporarse al sector en el cargo de ${cvData.role || "su elección"}. Excelente adaptabilidad, compromiso y disposición de aprendizaje rápido en España. Este es un ejemplo de capacitación profesional de modelo de curriculum vitae.`;
      const splitPerfil = doc.splitTextToSize(perfilText, 180);
      doc.text(splitPerfil, 15, y);
      y += splitPerfil.length * 5 + 8;
      
      doc.setTextColor(30, 58, 138);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text("FORMACIÓN ACADÉMICA", 15, y);
      doc.line(15, y + 2, 195, y + 2);
      y += 8;
      
      doc.setTextColor(50, 50, 50);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      const splitEdu = doc.splitTextToSize(cvData.edu || "Sin Formación especificada", 180);
      doc.text(splitEdu, 15, y);
      y += splitEdu.length * 5 + 8;
      
      doc.setTextColor(30, 58, 138);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text("COMPETENCIAS E IDIOMAS", 15, y);
      doc.line(15, y + 2, 195, y + 2);
      y += 8;
      
      doc.setTextColor(50, 50, 50);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      const splitSkills = doc.splitTextToSize(cvData.skills || "Idiomas y competencias técnicas", 180);
      doc.text(splitSkills, 15, y);
      y += splitSkills.length * 5 + 8;
      
      doc.setTextColor(30, 58, 138);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text("EXPERIENCIA PRÁCTICA (Muestras de ejemplo)", 15, y);
      doc.line(15, y + 2, 195, y + 2);
      y += 8;
      
      doc.setTextColor(50, 50, 50);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      const splitExp = doc.splitTextToSize(cvData.exp || "Sin experiencia previa registrada", 180);
      doc.text(splitExp, 15, y);
      y += splitExp.length * 5 + 15;
      
      doc.setDrawColor(220, 20, 60);
      doc.setLineWidth(0.5);
      doc.rect(15, y, 180, 22);
      
      doc.setTextColor(220, 20, 60);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.text("AVISO IMPORTANTE: EJEMPLO DE CV DE REFERENCIA (MODELO FICTICIO)", 20, y + 6);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.text("Este documento es una maqueta de ejemplo con datos ficticios para guiar a los estudiantes en la preparacion de su perfil.", 20, y + 11);
      doc.text("Asegúrate de reemplazar toda la información con tus datos personales verídicos antes de postular.", 20, y + 16);
      
      const safeRole = (cvData.role || "Ejemplo").replace(/\s+/g, "-");
      doc.save(`CV-Ejemplo-${safeRole}.pdf`);
    } catch (err) {
      console.error("CV PDF export failed:", err);
      alert("Error al descargar el PDF del CV. Inténtalo de nuevo.");
    }
  };

  useEffect(() => {
    handleLoadLesson(selectedLevel, currentPage);
  }, [selectedLevel, currentPage]);

  useEffect(() => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chats]);

  const handleVerifyExercise = (index: number, answerText: string, correctSpec: any, type: string) => {
    if (!answerText || answerText.trim() === "") return;
    let isCorrect = false;
    let feedback = "";

    if (type === "multiple-choice") {
      isCorrect = Number(answerText) === Number(correctSpec);
      feedback = isCorrect 
        ? "🎉 ¡CORRECTO! ¡Excelente razonamiento!" 
        : `❌ Incorrecto. La respuesta formal correcta es: ${lessonData?.practice[index]?.options?.[correctSpec]}`;
    } else if (type === "fill-blank") {
      isCorrect = answerText.trim().toLowerCase() === String(correctSpec).toLowerCase();
      feedback = isCorrect 
        ? "🎉 ¡Muy bien hecho! +15 XP" 
        : `💡 Casi. La palabra correcta que completa la oración es: "${correctSpec}"`;
    } else if (type === "translation") {
      isCorrect = answerText.trim().toLowerCase().includes(String(correctSpec).toLowerCase().substring(0, 5));
      feedback = isCorrect 
        ? "🎉 ¡Excelente traducción! Tienes excelente comprensión." 
        : `💡 Intenta escribir algo similar a: "${correctSpec}"`;
    } else {
      isCorrect = true;
      feedback = "✨ ¡Revisado por IA! Has sumado +15 XP a tu cuenta.";
    }

    setExResults(prev => ({
      ...prev,
      [index]: { ok: isCorrect, fb: feedback }
    }));

    if (isCorrect) {
      setProfile(prev => ({ ...prev, xp: prev.xp + 15 }));
    }
  };

  const handleAnswerExam = (qIndex: number, optionIndex: number) => {
    setExamAnswers(prev => ({ ...prev, [qIndex]: optionIndex }));
  };

  const handleSubmitExam = () => {
    if (!examData) return;
    let correctCount = 0;
    (examData.questions || []).forEach((q: any, i: number) => {
      if (examAnswers[i] === q.correctIndex) {
        correctCount++;
      }
    });

    const passRatio = correctCount / (examData.questions || []).length;
    const passed = passRatio >= 0.6;

    setExamScore(correctCount);
    setExamPassed(passed);
    setExamSubmitted(true);

    setProfile(prev => {
      const today = new Date().toDateString();
      let currentLives = prev.lives !== undefined ? prev.lives : 10;
      let lastRefill = prev.lastLivesRefill || today;
      if (lastRefill !== today) {
        currentLives = Math.min(10, currentLives + 3);
        lastRefill = today;
      }

      if (passed) {
        const examKey = `${selectedLevel}-${selectedExamId}`;
        const currentPassed = prev.passedExams_v2 || [];
        const updatedPassed = currentPassed.includes(examKey)
          ? currentPassed
          : [...currentPassed, examKey];

        const passedForLevel = prev.passedExamsForLevel || {};
        const levelPassedCount = (passedForLevel[selectedLevel] || 0);
        const alreadyCounted = currentPassed.includes(examKey);
        const newLevelCount = alreadyCounted ? levelPassedCount : levelPassedCount + 1;
        const updatedPassedForLevel = { ...passedForLevel, [selectedLevel]: newLevelCount };

        const allLevels = ["A1", "A2", "B1", "B2", "C1", "C2"];
        const currentIdx = allLevels.indexOf(prev.level);

        if (selectedLevel === prev.level && newLevelCount >= 3 && currentIdx < allLevels.length - 1) {
          const nextLevel = allLevels[currentIdx + 1];
          setSelectedLevel(nextLevel);
          setCurrentPage(getMinPage(nextLevel));
          return {
            ...prev,
            level: nextLevel,
            xp: prev.xp + 100,
            lives: currentLives,
            lastLivesRefill: lastRefill,
            passedExams_v2: updatedPassed,
            passedExamsForLevel: { ...updatedPassedForLevel, [nextLevel]: 0 }
          };
        } else {
          return {
            ...prev,
            xp: prev.xp + 100,
            lives: currentLives,
            lastLivesRefill: lastRefill,
            passedExams_v2: updatedPassed,
            passedExamsForLevel: updatedPassedForLevel
          };
        }
      } else {
        const newLives = Math.max(0, currentLives - 3);
        return {
          ...prev,
          lives: newLives,
          lastLivesRefill: lastRefill
        };
      }
    });
  };

  const handleSendChatChatroom = async () => {
    if (!chatInp.trim()) return;
    const originalText = chatInp;
    setChatInp("");

    const userName = loggedStudent ? loggedStudent.name : "Invitado";

    try {
      const resPost = await fetch("/api/community/post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user: userName,
          text: originalText
        })
      });
      if (resPost.ok) {
        fetchStats();
        setProfile(p => ({ ...p, xp: p.xp + 5 }));
      }
    } catch (e) {
      console.error("Error posting to database chatroom:", e);
    }

    const lower = originalText.toLowerCase().trim();
    let fallbackTip = "";

    if (lower.includes("yo quiere") || lower.includes("yo quiere estudiar")) {
      fallbackTip = "💡 Tip del Profesor: El verbo 'querer' es irregular en primera persona. Decimos 'Yo quiero estudiar' (e -> ie). ¡Buen intento, sigue practicando!";
    } else if (lower.includes("yo tener")) {
      fallbackTip = "💡 Tip del Profesor: Recuerda que 'tener' cambia en primera persona del presente. Se dice 'Yo tengo' (irregular: g-presente). ¡Sigue así!";
    } else if (lower.includes("espanol") && !lower.includes("español")) {
      fallbackTip = "💡 Tip Ortográfico: En español se usa la letra 'ñ'. Escribimos 'español'. Mantén pulsada la tecla 'n' para seleccionarla en tu teclado móvil.";
    } else if (lower.includes("yo gustar")) {
      fallbackTip = "💡 Tip Gramatical: Decimos 'Me gusta' en vez de 'yo gustar'. Ejemplo: 'Me gusta la cultura española'.";
    } else if (lower.includes("hola") || lower.includes("buenos dias") || lower.includes("que tal") || lower.includes("saludos")) {
      fallbackTip = "✨ ¡Bienvenido a nuestra comunidad de estudiantes españoles! ¿En qué ciudad de España estás planeando cursar tu formación profesional o estudios? Recuerda que tienes guías completas de ciudades en la pestaña de 'Guía de Ciudades' para explorar toda la información.";
    } else if (lower.includes("madrid") || lower.includes("barcelona") || lower.includes("valencia") || lower.includes("sevilla") || lower.includes("malaga")) {
      fallbackTip = "👍 ¡Un destino fantástico! Te sugiero que consultes la sección de 'Guía de Ciudades' donde puedes ver mapas, puntos de interés, y consejos prácticos sobre los supermercados de esa zona.";
    } else if (lower.includes("nie") || lower.includes("visado") || lower.includes("seguro") || lower.includes("empadronamiento")) {
      fallbackTip = "📋 Pro-Tip Comunidad: Comprueba las guías oficiales en la pestaña 'Etapas Clave'. El seguro de salud debe hacerse *antes* del visado, y el empadronamiento justo después de tener tu contrato de alquiler o residencia.";
    }

    try {
      const response = await fetch("/api/chat-correct", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: originalText })
      });
      if (response.ok) {
        const { tip } = await response.json();
        if (tip) {
          setTimeout(async () => {
            await fetch("/api/community/post", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                user: "Profesor de España 🤖",
                text: tip
              })
            });
            fetchStats();
            setProfile(prev => ({ ...prev, xp: prev.xp + 10 }));
          }, 930);
          return;
        }
      }
    } catch (e) {
      console.error("Gemini correction error, using fallback:", e);
    }

    if (fallbackTip) {
      setTimeout(async () => {
        await fetch("/api/community/post", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user: "Profesor de España 🤖",
            text: fallbackTip
          })
        });
        fetchStats();
      }, 930);
    } else {
      setTimeout(async () => {
        const studentReplies = [
          "¡Hola! Bienvenido a la comunidad. ¡Mucho ánimo con tu aprendizaje!",
          "¡Hola! Yo también estoy estudiando español y preparando el visado. ¡Espero que nos veamos pronto!",
          "¡Hola compatriota! Cualquier duda que tengas sobre los estudios en España, puedes escribirla por aquí.",
          "¡Hola! Te recomiendo usar el Generador de CV Profesional y revisar los ejemplos de referencia en la segunda pestaña.",
          "¡Qué bien! Si necesitas practicar gramática, te animo a contestar los retos prácticos de la pestaña de 'Cursos de español'."
        ];
        const randomGreeting = studentReplies[Math.floor(Math.random() * studentReplies.length)];
        const randomUser = Math.random() > 0.5 ? "Sofia_es" : "Youssef_ma";

        await fetch("/api/community/post", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user: randomUser,
            text: randomGreeting
          })
        });
        fetchStats();
      }, 2000);
    }
  };

  const handleDownloadCityPDF = (cityObj: typeof STUDENT_CITIES_GUIDE[0]) => {
    try {
      const doc = new jsPDF();
      doc.setFillColor(12, 18, 34);
      doc.rect(0, 0, 210, 297, "F");
      
      doc.setTextColor(245, 158, 11);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(22);
      doc.text("SPAIN STUDY PORTAL", 105, 35, { align: "center" });
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(14);
      doc.text(`Official Student Guide & City Map: ${cityObj.city.toUpperCase()} ${cityObj.flag}`, 105, 48, { align: "center" });
      
      doc.setDrawColor(245, 158, 11);
      doc.setLineWidth(1);
      doc.line(20, 56, 190, 56);
      
      doc.setFillColor(27, 37, 59);
      doc.rect(20, 68, 170, 48, "F");
      
      doc.setTextColor(245, 158, 11);
      doc.setFontSize(11);
      doc.text("1. EVENTS, SALSA & STUDENT LIFE ACTIVITIES", 25, 76);
      doc.setTextColor(230, 230, 230);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      
      const eventsText = cityObj.events[lang as keyof typeof cityObj.events] || cityObj.events.es;
      const splitEvents = doc.splitTextToSize(eventsText, 160);
      doc.text(splitEvents, 25, 84);
      
      doc.setFillColor(27, 37, 59);
      doc.rect(20, 126, 170, 48, "F");
      
      doc.setTextColor(52, 211, 153);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text("2. INTEGRATION & MAKING LOCAL FRIENDS", 25, 134);
      doc.setTextColor(230, 230, 230);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      
      const friendsText = cityObj.friends[lang as keyof typeof cityObj.friends] || cityObj.friends.es;
      const splitFriends = doc.splitTextToSize(friendsText, 160);
      doc.text(splitFriends, 25, 142);
      
      doc.setFillColor(27, 37, 59);
      doc.rect(20, 184, 170, 48, "F");
      
      doc.setTextColor(96, 165, 250);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text("3. SUPERMARKET RATINGS & BUDGETING", 25, 192);
      doc.setTextColor(230, 230, 230);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      
      const marketText = `Rankings: ${cityObj.supermarkets.ranking[lang as keyof typeof cityObj.supermarkets.ranking] || cityObj.supermarkets.ranking.es}\nTips: ${cityObj.supermarkets.tips[lang as keyof typeof cityObj.supermarkets.tips] || cityObj.supermarkets.tips.es}`;
      const splitMarket = doc.splitTextToSize(marketText, 160);
      doc.text(splitMarket, 25, 200);

      doc.setTextColor(150, 150, 150);
      doc.setFontSize(8.5);
      doc.text("Generated via Spain Study Student Portal. Verify live schedule and locations continuously.", 105, 260, { align: "center" });
      
      doc.setTextColor(245, 158, 11);
      doc.setFontSize(10);
      doc.text(`Download completed successfully. Save this PDF on your device offline!`, 105, 275, { align: "center" });

      doc.save(`Spain-Study-${cityObj.city}-Guide.pdf`);
    } catch (err) {
      console.error("PDF generation failed:", err);
      alert("Error generating PDF Guide. Please try again.");
    }
  };

  if (userRole === "admin") {
    return (
      <div className="min-h-screen bg-[#070a13] text-gray-200 flex flex-col font-sans select-none antialiased">
        <header className="bg-[#0c1222] border-b border-[#1b253b] p-4 flex items-center justify-between flex-wrap gap-4 shadow-lg shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-amber-500 text-[#070a13] w-10 h-10 rounded-xl flex items-center justify-center font-black text-2xl shadow-md font-sans">
              🇪🇸
            </div>
            <div>
              <h1 className="font-bold text-lg tracking-tight text-white flex items-center gap-2">
                Atrévete a España <span className="text-xs bg-red-500/10 border border-red-500/20 text-red-400 px-2 py-0.5 rounded font-mono font-bold tracking-widest">OWNER PORTAL</span>
              </h1>
              <p className="text-xs text-gray-400 font-sans font-medium">Consola de Control de Negocio & Analítica BI en Tiempo Real</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs font-mono text-gray-400">Bienvenido, <strong>Administrador</strong></span>
            <button 
              onClick={handleLogout}
              className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-xs font-bold rounded-xl transition-all cursor-pointer font-sans"
            >
              Cerrar Sesión Pro
            </button>
          </div>
        </header>
        <AdminDashboard 
          lang={lang} 
          onLogout={handleLogout} 
          dbStats={dbStats} 
          onRefreshStats={fetchStats} 
          t={t} 
        />
      </div>
    );
  }

  if (userRole === null) {
    return (
      <div className="min-h-screen bg-[#070a13] text-gray-200 flex flex-col justify-center items-center p-4 sm:p-6 font-sans">
        <div className="max-w-4xl w-full space-y-8">
          
          <div className="text-center space-y-3">
            <span className="text-4xl sm:text-5xl">🇪🇸 ✈️ 🎓</span>
            <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight mt-2">
              Atrévete a España
            </h1>
            <p className="text-sm text-gray-400 max-w-lg mx-auto leading-relaxed font-sans">
              La plataforma de acompañamiento integral y preparación de español para alumnos de Marruecos, Argelia y otros países árabes.
            </p>
          </div>

          <div className="bg-[#0b1222] border-2 border-[#1c2e4f] rounded-3xl overflow-hidden shadow-2xl">
            <div className="flex border-b border-[#1c2e4f] bg-[#080d1a]">
              <button
                type="button"
                onClick={() => { setActivePortalTab("student"); setAuthError(""); }}
                className={`flex-1 py-4 text-xs sm:text-sm font-bold tracking-wider uppercase transition-colors ${activePortalTab === "student" ? 'bg-[#0b1222] text-amber-400 border-b-2 border-amber-500' : 'text-gray-400 hover:text-white hover:bg-gray-800/20'}`}
              >
                🎓 Portal para Estudiantes
              </button>
              <button
                type="button"
                onClick={() => { setActivePortalTab("creator"); setAuthError(""); }}
                className={`flex-1 py-4 text-xs sm:text-sm font-bold tracking-wider uppercase transition-colors ${activePortalTab === "creator" ? 'bg-[#0b1222] text-amber-400 border-b-2 border-amber-500' : 'text-gray-400 hover:text-white hover:bg-gray-800/20'}`}
              >
                🏢 Portal de Anfitriones y Creadores
              </button>
            </div>

            <div className="p-6 sm:p-8">
              {authError && (
                <div className="mb-6 p-4 bg-red-500/10 border-2 border-red-500/20 rounded-2xl text-xs text-red-500 font-medium font-sans">
                  ⚠️ {authError}
                </div>
              )}

              {activePortalTab === "student" ? (
                <form onSubmit={handleStudentLogin} className="space-y-5 animate-fade-in">
                  <div className="space-y-2 border-b border-gray-800/60 pb-3">
                    <p className="text-[10px] text-amber-500 uppercase tracking-widest font-mono font-bold">Inscripción Obligatoria de Alumno - Registro de Expediente Único</p>
                    <p className="text-xs text-gray-400 leading-snug font-sans">
                      Por favor, completa todos tus datos personales, académicos y de destino reales. Su expediente iniciará con un Score de <strong className="text-emerald-400">0 XP</strong>.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {/* COLUMNA 1: DATOS PERSONALES */}
                    <div className="space-y-3.5 bg-gray-900/20 p-4 rounded-2xl border border-gray-800/40">
                      <h4 className="text-[11px] font-bold text-amber-500 uppercase tracking-wider font-mono">1. Datos Personales</h4>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] text-gray-400 uppercase font-mono block mb-1">Nombre</label>
                          <input
                            type="text"
                            placeholder="Ej: Sofia"
                            value={studentNameInput}
                            onChange={(e) => setStudentNameInput(e.target.value)}
                            className="w-full bg-[#070a13] border border-gray-800 rounded-xl p-2.5 text-xs text-white outline-none focus:border-amber-500 font-sans"
                            required
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-gray-400 uppercase font-mono block mb-1">Apellido</label>
                          <input
                            type="text"
                            placeholder="Ej: Mansouri"
                            value={studentLastNameInput}
                            onChange={(e) => setStudentLastNameInput(e.target.value)}
                            className="w-full bg-[#070a13] border border-gray-800 rounded-xl p-2.5 text-xs text-white outline-none focus:border-amber-500 font-sans"
                            required
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-3">
                        <div className="col-span-2">
                          <label className="text-[10px] text-gray-400 uppercase font-mono block mb-1">Número de Teléfono</label>
                          <input
                            type="tel"
                            placeholder="+212 612-345678"
                            value={studentPhoneInput}
                            onChange={(e) => setStudentPhoneInput(e.target.value)}
                            className="w-full bg-[#070a13] border border-gray-800 rounded-xl p-2.5 text-xs text-white outline-none focus:border-amber-500 font-mono"
                            required
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-gray-400 uppercase font-mono block mb-1">Edad</label>
                          <input
                            type="number"
                            min="14"
                            max="75"
                            placeholder="20"
                            value={studentAgeInput}
                            onChange={(e) => setStudentAgeInput(e.target.value)}
                            className="w-full bg-[#070a13] border border-gray-800 rounded-xl p-2.5 text-xs text-white outline-none focus:border-amber-500 font-sans"
                            required
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-[10px] text-gray-400 uppercase font-mono block mb-1">Correo Electrónico Oficial</label>
                        <input
                          type="email"
                          placeholder="sofia@gmail.com"
                          value={studentEmailInput}
                          onChange={(e) => setStudentEmailInput(e.target.value)}
                          className="w-full bg-[#070a13] border border-gray-800 rounded-xl p-2.5 text-xs text-white outline-none focus:border-amber-500 font-mono"
                          required
                        />
                      </div>

                      <div>
                        <label className="text-[10px] text-gray-400 uppercase font-mono block mb-1 font-sans">Género</label>
                        <select
                          value={studentGenderInput}
                          onChange={(e) => setStudentGenderInput(e.target.value)}
                          className="w-full bg-[#070a13] border border-gray-800 rounded-xl p-2.5 text-xs text-white outline-none focus:border-amber-500 font-sans"
                        >
                          <option value="Femenino">Femenino</option>
                          <option value="Masculino">Masculino</option>
                        </select>
                      </div>
                    </div>

                    {/* COLUMNA 2: ORIGEN, RESIDENCIA Y ACADÉMICO */}
                    <div className="space-y-3.5 bg-gray-900/20 p-4 rounded-2xl border border-gray-800/40">
                      <h4 className="text-[11px] font-bold text-amber-500 uppercase tracking-wider font-mono">2. Ubicación y Metas Académicas</h4>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] text-gray-400 uppercase font-mono block mb-1">País Nacimiento (Origen)</label>
                          <select
                            value={studentCountryInput}
                            onChange={(e) => {
                              const val = e.target.value;
                              setStudentCountryInput(val);
                              setStudentCurrentCountryInput(val);
                            }}
                            className="w-full bg-[#070a13] border border-gray-800 rounded-xl p-2.5 text-xs text-white outline-none focus:border-amber-500 font-sans"
                          >
                            <option value="Morocco">🇲🇦 Marruecos</option>
                            <option value="Algeria">🇩🇿 Argelia</option>
                            <option value="Tunisia">🇹🇳 Túnez</option>
                            <option value="Egypt">🇪🇬 Egipto</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-[10px] text-gray-400 uppercase font-mono block mb-1">País Residencia Actual</label>
                          <select
                            value={studentCurrentCountryInput}
                            onChange={(e) => setStudentCurrentCountryInput(e.target.value)}
                            className="w-full bg-[#070a13] border border-gray-800 rounded-xl p-2.5 text-xs text-white outline-none focus:border-amber-500 font-sans"
                          >
                            <option value="Morocco">🇲🇦 Marruecos</option>
                            <option value="Algeria">🇩🇿 Argelia</option>
                            <option value="Tunisia">🇹🇳 Túnez</option>
                            <option value="Egypt">🇪🇬 Egipto</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] text-gray-400 uppercase font-mono block mb-1">Ciudad Actual</label>
                          <input
                            type="text"
                            placeholder="Ej: Casablanca"
                            value={studentCurrentCityInput}
                            onChange={(e) => setStudentCurrentCityInput(e.target.value)}
                            className="w-full bg-[#070a13] border border-gray-800 rounded-xl p-2.5 text-xs text-white outline-none focus:border-amber-500 font-sans"
                            required
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-gray-400 uppercase font-mono block mb-1">Ciudad Destino (España)</label>
                          <select
                            value={studentTargetCityInput}
                            onChange={(e) => setStudentTargetCityInput(e.target.value)}
                            className="w-full bg-[#070a13] border border-gray-800 rounded-xl p-2.5 text-xs text-white outline-none focus:border-amber-500 font-sans"
                          >
                            <option value="Madrid">Madrid</option>
                            <option value="Barcelona">Barcelona</option>
                            <option value="Valencia">Valencia</option>
                            <option value="Sevilla">Sevilla</option>
                            <option value="Zaragoza">Zaragoza</option>
                            <option value="Granada">Granada</option>
                            <option value="Málaga">Málaga</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="text-[10px] text-gray-400 uppercase font-mono block mb-1">Formación Actual cursada</label>
                        <select
                          value={studentCurrentEduInput}
                          onChange={(e) => setStudentCurrentEduInput(e.target.value)}
                          className="w-full bg-[#070a13] border border-gray-800 rounded-xl p-2.5 text-xs text-white outline-none focus:border-amber-500 font-sans"
                        >
                          <option value="Bachillerato">Bacalauréat / Bachillerato</option>
                          <option value="Estudios Universitarios Graduado">Estudios Universitarios (Licenciatura)</option>
                          <option value="Formación Profesional Inicial">FP Inicial o Medio</option>
                          <option value="Máster Completo">Máster / Postgrado</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[10px] text-gray-400 uppercase font-mono block mb-1">Formación de Interés (España)</label>
                        <select
                          value={studentGoalInput}
                          onChange={(e) => setStudentGoalInput(e.target.value)}
                          className="w-full bg-[#070a13] border border-gray-800 rounded-xl p-2.5 text-xs text-white outline-none focus:border-amber-500 font-sans"
                        >
                          <option value="FP Grado Superior">FP Grado Superior (2 años)</option>
                          <option value="Universidad">Universidad (Estudios de Grado)</option>
                          <option value="Grado Medio">FP Grado Medio (Técnico)</option>
                          <option value="Máster">Máster de Postgrado Oficial</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="bg-[#070f1a] border border-amber-500/20 p-4 rounded-2xl">
                    <label className="text-[10px] text-amber-500 uppercase font-mono block mb-2 font-bold">🎓 Tu Nivel Actual de Español</label>
                    <p className="text-[10px] text-gray-500 mb-2">Este nivel no podrá modificarse después del registro.</p>
                    <select
                      value={studentSpanishLevelInput}
                      onChange={(e) => setStudentSpanishLevelInput(e.target.value)}
                      className="w-full bg-[#070a13] border border-amber-500/30 rounded-xl p-2.5 text-xs text-white outline-none focus:border-amber-500 font-sans"
                    >
                      <option value="A1">A1 — Principiante (no sé nada de español)</option>
                      <option value="A2">A2 — Básico (entiendo frases simples)</option>
                      <option value="B1">B1 — Intermedio (me comunico en situaciones cotidianas)</option>
                      <option value="B2">B2 — Intermedio-Alto (converso con fluidez)</option>
                      <option value="C1">C1 — Avanzado (dominio casi nativo)</option>
                      <option value="C2">C2 — Maestría (nivel universitario nativo)</option>
                    </select>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-4 bg-amber-500 hover:bg-amber-600 text-black font-extrabold text-xs tracking-widest uppercase rounded-2xl cursor-pointer transition-transform duration-150 transform active:scale-95 shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 font-sans text-center mt-5"
                  >
                    🚀 Regístrate o Entra con este Perfil
                  </button>
                </form>
              ) : (
                <form onSubmit={handleAdminLogin} className="space-y-4">
                  <div className="space-y-2">
                    <p className="text-xs text-gray-400 leading-snug font-sans">Acceso restringido. Solo personal autorizado.</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] text-gray-400 uppercase font-mono block mb-1.5 font-sans">Correo del Administrador</label>
                      <input
                        type="email"
                        placeholder="correo@ejemplo.com"
                        value={adminEmailInput}
                        onChange={(e) => setAdminEmailInput(e.target.value)}
                        className="w-full bg-[#070a13] border border-gray-800 rounded-xl p-3 text-xs text-white outline-none focus:border-amber-500 font-sans"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-400 uppercase font-mono block mb-1.5 font-sans">Contraseña Maestra</label>
                      <input
                        type="password"
                        placeholder="••••••••"
                        value={adminPasswordInput}
                        onChange={(e) => setAdminPasswordInput(e.target.value)}
                        className="w-full bg-[#070a13] border border-gray-800 rounded-xl p-3 text-xs text-white outline-none focus:border-amber-500 font-sans"
                        required
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3.5 bg-amber-500 hover:bg-amber-600 text-black font-extrabold text-xs tracking-widest uppercase rounded-2xl cursor-pointer transition-transform mt-4 flex items-center justify-center gap-2 font-sans text-center"
                  >
                    Iniciar Consola de Creadores ➔
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070a13] text-gray-200 flex flex-col font-sans select-none antialiased">
      
      {/* HEADER BANNER */}
      <header className="sticky top-0 z-50 bg-[#0c1222] border-b border-[#1b253b] px-4 py-3 flex items-center justify-between flex-wrap gap-3 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="bg-amber-500 text-[#070a13] w-10 h-10 rounded-xl flex items-center justify-center font-black text-2xl shadow-md">
            🇪🇸
          </div>
          <div>
            <h1 className="font-bold text-lg tracking-tight text-white flex items-center gap-2 font-sans">
              Spain Study Portal
              {loggedStudent ? (
                <span className="bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[9px] font-mono tracking-widest px-2 py-0.5 rounded uppercase">
                  Alumno: {loggedStudent.name}
                </span>
              ) : (
                <span className="bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] font-mono tracking-widest px-2 py-0.5 rounded uppercase">
                  ARABIC-ACCESSIBLE
                </span>
              )}
            </h1>
            <p className="text-xs text-gray-400 font-sans">
              {lang === "ar" ? "بوابة الإعداد الشاملة والتعليمية للطلاب العرب الراغبين بالدراسة والعمل في إسبانيا" :
               lang === "fr" ? "Portail interactif de préparation et d'espagnol pour étudiants arabes en Espagne" :
               lang === "es" ? "Portal de preparación educativa para estudiantes árabes en España" :
               "Interactive preparation and vocabulary handbook for Arab students in Spain"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 flex-wrap">
          {/* Native Language Select Switcher */}
          <div className="bg-[#070a13] border border-[#1e293b] p-1 rounded-xl flex gap-1 items-center">
            {LANGUAGES.map(l => (
              <button 
                key={l.code}
                id={`lang-btn-${l.code}`}
                onClick={() => setLang(l.code)}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-transform focus:outline-none ${lang === l.code ? 'bg-amber-500 text-gray-900 font-bold scale-105 shadow-md' : 'text-gray-400 hover:text-white'}`}
              >
                <span className="mr-1">{l.flag}</span>
                {l.label}
              </button>
            ))}
          </div>

          {/* Real-time Game stats engine */}
          <div className="flex items-center gap-3 bg-[#070a13] border border-[#1e293b] px-3 py-1.5 rounded-xl shadow-inner font-mono text-xs">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-gray-500 font-sans uppercase">Score</span>
              <span className="text-emerald-400 font-bold">{profile.xp} XP</span>
            </div>
            <div className="w-px h-4 bg-gray-700"></div>
            <div className="flex items-center gap-1 cursor-pointer" title={`Vidas: ${profile.lives !== undefined ? profile.lives : 10}/10. Examen fallado: -3. Cada día: +3 automático.`}>
              {Array.from({length: Math.min(profile.lives !== undefined ? profile.lives : 10, 10)}).map((_, i) => (
                <Flame key={i} size={10} className="text-amber-500 fill-amber-500" />
              ))}
              <span className="text-amber-400 font-bold ml-1">{profile.lives !== undefined ? profile.lives : 10}/10</span>
            </div>
            <div className="w-px h-4 bg-gray-700"></div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-gray-500 font-sans uppercase">Exámenes</span>
              <span className="text-blue-400 font-bold">{((profile.passedExamsForLevel || {})[profile.level] || 0)}/3</span>
            </div>
            <div className="w-px h-4 bg-gray-700"></div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-gray-500 font-sans uppercase">CEFR</span>
              <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded font-bold uppercase">{profile.level}</span>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-xs font-bold rounded-xl transition-all cursor-pointer font-sans"
          >
            Cerrar Sesión
          </button>
        </div>
      </header>

      {/* CORE FRAMEWORK BODY */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 flex flex-col md:flex-row gap-6">
        
        {/* SIDEBAR NAVIGATION & SELECTIVE STUDENT FILE */}
        <aside className="w-full md:w-[260px] flex-shrink-0 flex flex-col gap-4">
          
          {/* Main sections Navigation rail */}
          <nav className="bg-[#0c1222] border border-[#1b253b] p-2 rounded-2xl flex flex-col gap-1.5 shadow-md" id="nav-rail">
            {NAV_ITEMS.map(n => {
              const active = tab === n.key;
              return (
                <button
                  key={n.key}
                  id={`nav-item-${n.key}`}
                  onClick={() => { setTab(n.key); setExamActive(false); }}
                  className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-3 transition-colors ${active ? 'bg-amber-500 text-[#070a13] font-bold shadow-md' : 'text-gray-400 hover:text-white hover:bg-gray-800/50'}`}
                >
                  <span className="text-base">{n.icon}</span>
                  <span>{t(n)}</span>
                  {n.key === "ebook" && (
                    <span className="ml-auto bg-black/15 text-[9px] font-mono px-1.5 py-0.5 rounded text-white">Active</span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Quick profile goals coordinator */}
          <div className="bg-[#0c1222] border border-[#1b253b] p-4 rounded-2xl shadow-md">
            <h3 className="text-[11px] font-bold tracking-widest text-[#94a3b8] uppercase mb-3 flex items-center gap-2">
              <User size={12} className="text-amber-500" />
              {lang === "ar" ? "بيانات ملفي وهدفي" :
               lang === "fr" ? "Profil & Objectif" :
               lang === "es" ? "Mi Expediente de metas" :
               "My Goal & Origin"}
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="text-[10px] text-gray-400 block mb-1">
                  {lang === "ar" ? "البلد الأصلي" : lang === "fr" ? "Pays d'Origine" : "Country of Origin"}
                </label>
                <select 
                  value={profile.country}
                  onChange={(e) => {
                    const val = e.target.value;
                    setProfile(prev => ({ ...prev, country: val }));
                    setVisaCountry(val);
                  }}
                  className="w-full bg-[#070a13] border border-[#232f4e] rounded-lg text-xs p-2 text-white outline-none focus:border-amber-500"
                >
                  <option value="morocco">🇲🇦 Maroc / المغرب</option>
                  <option value="algeria">🇩🇿 Algérie / الجزائر</option>
                  <option value="tunisia">🇹🇳 Tunisie / تونس</option>
                  <option value="egypt">🇪🇬 Égypte / مصر</option>
                  <option value="jordan">🇯🇴 Jordanie / الأردن</option>
                  <option value="lebanon">🇱🇧 Liban / لبنان</option>
                  <option value="gulf_gcc">🇸🇦🇦🇪 Pays du Golfe / الخليج</option>
                  <option value="iraq_syria">🇮🇶🇸🇾 Irak & Syrie / العراق وسوريا</option>
                  <option value="middleeast">🌍 Autre Moyen-Orient / باقي الشرق الأوسط</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] text-gray-400 block mb-1">
                  {lang === "ar" ? "الهدف الدراسي المخطط له" : lang === "fr" ? "Projet en Espagne" : "Target Study Route"}
                </label>
                <select
                  value={profile.goal}
                  onChange={(e) => setProfile(prev => ({ ...prev, goal: e.target.value }))}
                  className="w-full bg-[#070a13] border border-[#232f4e] rounded-lg text-xs p-2 text-white outline-none focus:border-amber-500"
                >
                  <option value="FP Grado Superior">FP Grado Superior (2 años)</option>
                  <option value="FP Grado Medio">FP Grado Medio (2 ans)</option>
                  <option value="Universidad (Grado)">Estudios Universitarios (Grado)</option>
                  <option value="Máster Universitario">Máster Universitario (60 ECTS)</option>
                  <option value="Doctorado o Investigación">Doctorado (PhD)</option>
                </select>
              </div>

              <div className="p-3 bg-[#070a13] border border-[#1b253b] rounded-xl text-[11px] text-gray-400 leading-relaxed font-sans mt-2">
                <span className="text-amber-400 font-bold block mb-1">🎯 {lang === "ar" ? "توجيه ذكي" : "Advice for you"}</span>
                {profile.goal.includes("FP") 
                  ? (lang === "ar" ? "للتسجيل in التكوين المهني FP، ننصحك بالتقديم السريع على معادلة شهادة البكالوريا Homologación لوزارة التربية، تستغرق المعالجة من 6 إلى 12 شهراً." :
                     "Pour démarrer un programme de Formation Professionnelle FP, préparez en priorité l'homologation de votre diplôme de Baccalauréat auprès du Ministère espagnol.")
                  : (lang === "ar" ? "للدراسة بالجامعة، ابدأ بالاتصال بـ UNEDasiss لإرسال درجاتك واجتياز مواد PCE الاختيارية لرفع معدل القبول." :
                     "Pour l'admission directe en Licence, vous devez passer les examens PCE de Selectividad via l'organisme UNEDasiss.")
                }
              </div>
            </div>
          </div>
        </aside>

        {/* PRIMARY INTERACTIVE CONTENT REGION */}
        <main className="flex-1 min-w-0 flex flex-col gap-6">
          
          {/* TAB 1: FULL ROADMAP VIEW */}
          {tab === "roadmap" && (
            <div className="bg-[#0c1222] border border-[#1b253b] p-6 rounded-3xl shadow-xl">
              <div className="mb-4">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Map className="text-amber-500" />
                  {lang === "ar" ? "خارطة طريق الطالب في إسبانيا" :
                   lang === "fr" ? "Feuille de Route de l'Étudiant Voyageur" :
                   lang === "es" ? "Hoja de Ruta de Extranjería y Academia" :
                   "Comprehensive Pathway Map"}
                </h2>
                <p className="text-xs text-gray-400 mt-1">
                  {lang === "ar" ? "الخطوات الكاملة منذ الفكرة وقبول المؤسسة حتى العمل والمنظومة الضريبية" :
                   "Les étapes clés ordonnées de manière séquentielle pour accomplir votre parcours à succès en Espagne."}
                </p>
              </div>

              {/* Strict Scope Disclaimer */}
              <div className="bg-amber-500/5 border border-amber-500/20 px-4 py-3 rounded-2xl text-xs text-amber-400 leading-relaxed flex items-start gap-2.5 mb-6">
                <AlertTriangle size={18} className="flex-shrink-0 text-amber-500" />
                <div>
                  <strong>{lang === "ar" ? "تنبيه إخلاء مسؤولية قانوني:" : "Information & Avertissement Légal :"}</strong>{" "}
                  {lang === "ar" ? "هذه المعلومات لأغراض إرشادية وتدريبية تم تجميعها من واقع قوانين الهجرة الإسبانية. ننصحك دائماً بمراجعة الموقع الرسمي للخارجية الإسبانية أو مكاتب الهجرة المختصة لكون اللوائح متغيرة على الدوام." :
                   "Ce guide est conçu par notre expert d'IA à des fins éducatives et de consolidation. Il ne remplace en aucun caso les services d'un procureur ou avocat spécialisé. Veuillez consulter les sites officiels (Sede Extranjería/Consulat) pour le suivi légal."}
                </div>
              </div>

              {/* Sequenced Roadmap list */}
              <div className="relative pl-6 border-l border-gray-800 space-y-8 my-4">
                {ROADMAP_STEPS.map((step) => {
                  const isCompleted = completedSteps.includes(step.n);
                  const toggleStep = () => {
                    if (isCompleted) {
                      setCompletedSteps(prev => prev.filter(item => item !== step.n));
                    } else {
                      setCompletedSteps(prev => [...prev, step.n]);
                    }
                  };

                  return (
                    <div key={step.n} className="relative">
                      <button 
                        onClick={toggleStep}
                        title={isCompleted ? "Marcar como pendiente" : "Marcar como completado"}
                        className={`absolute -left-[37px] top-1.5 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold font-mono border-2 shadow transition-all hover:scale-110 cursor-pointer ${
                          isCompleted 
                            ? 'bg-emerald-500 text-[#070a13] border-emerald-400' 
                            : 'bg-gray-900 text-amber-500 border-amber-500/35 hover:border-amber-400'
                        }`}
                      >
                        {isCompleted ? "✔" : step.n}
                      </button>

                      <div 
                        onClick={toggleStep}
                        className={`p-4 rounded-xl shadow-sm transition-all border cursor-pointer select-none ${
                          isCompleted 
                            ? 'bg-[#0c1a23] border-emerald-500/20' 
                            : 'bg-[#070a13] border-[#1b253b] hover:border-amber-500/30'
                        }`}
                      >
                        <div className="flex items-center gap-2 justify-between">
                          <h4 className={`font-bold text-sm tracking-tight transition-colors ${isCompleted ? 'text-emerald-300' : 'text-gray-100'}`}>
                            {t(step)}
                          </h4>
                          
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleStep();
                            }}
                            className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full transition-colors cursor-pointer ${
                              isCompleted 
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                                : 'bg-gray-800 text-gray-400 hover:text-white border border-gray-700/60'
                            }`}
                          >
                            {isCompleted 
                              ? (lang === "ar" ? "مكتمل ✓" : "Completado ✓") 
                              : (lang === "ar" ? "تحديد كمكتمل" : "Marcar completado")}
                          </button>
                        </div>
                        <p className="text-xs text-gray-400 mt-2 leading-relaxed">{t(step.sub)}</p>
                        
                        <div className="flex gap-1.5 flex-wrap mt-3">
                          {step.tags[lang as "es" | "fr" | "ar" | "en"]?.map((tg, idx) => (
                            <span key={idx} className="bg-gray-800/60 border border-gray-700/50 text-gray-400 text-[10px] px-2 py-0.5 rounded font-mono">
                              {tg}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: VISA BY COUNTRY COORDINATOR */}
          {tab === "visa" && (
            <div className="bg-[#0c1222] border border-[#1b253b] p-6 rounded-3xl shadow-xl">
              <div className="mb-5 flex items-start justify-between flex-wrap gap-2">
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <Globe className="text-amber-500" />
                    {lang === "ar" ? "دليل الهجرة ووثائق التأشيرة" : "Visa Etudiant & Consulates de votre Pays"}
                  </h2>
                  <p className="text-xs text-gray-400 mt-1">
                    {lang === "ar" ? "حدد بلدك لمعرفة تفاصيل القنصلية والمستندات المطلوبة بدقة" : "Matériel d'inscription requis en fonction de votre nationalité et démarches consulaires."}
                  </p>
                </div>
              </div>

              <div className="flex gap-2 flex-wrap bg-[#070a13] p-1 border border-gray-800/80 rounded-2xl mb-6">
                {Object.entries(VISA_DATA).map(([key, value]) => (
                  <button
                    key={key}
                    onClick={() => setVisaCountry(key)}
                    className={`px-4 py-2 text-xs font-semibold rounded-xl focus:outline-none transition-colors ${visaCountry === key ? 'bg-amber-500 text-gray-900 font-bold' : 'text-gray-400 hover:text-white'}`}
                  >
                    {t(value.name)}
                  </button>
                ))}
              </div>

              {(() => {
                const data = (VISA_DATA as any)[visaCountry] || VISA_DATA.morocco;
                return (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 gap-4">
                      <div className="p-4 bg-[#070a13] border border-blue-500/10 rounded-2xl">
                        <span className="text-[10px] text-blue-400 uppercase tracking-widest font-mono">
                          {lang === "ar" ? "القنصليات والجهات الرسمية المختصة" : "Autorités Consulaires de Référence / Competent Consulates"}
                        </span>
                        <h4 className="font-bold text-white text-xs mt-1.5 leading-relaxed">{t(data.consulate)}</h4>
                      </div>
                    </div>

                    <div className="border-t border-gray-800 pt-5">
                      <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                        <CheckSquare size={14} className="text-amber-500" />
                        {lang === "ar" ? "الوثائق الإلزامية في الملف" : "Dossier légal requis (Pièces Obligatoires)"}
                      </h3>

                      <div className="space-y-4">
                        {data.docs.map((doc: any, idx: number) => (
                          <div key={idx} className="bg-[#070a13] border border-[#1b253b] p-4 rounded-xl flex items-start gap-3 hover:border-amber-500/25 transition-all">
                            <span className="bg-amber-500/10 text-amber-400 text-xs font-bold h-6 w-6 rounded-lg flex items-center justify-center shrink-0">
                              {idx+1}
                            </span>
                            <div>
                              <h5 className="font-bold text-xs text-white leading-tight">{t(doc.n)}</h5>
                              <p className="text-xs text-gray-400 mt-1.5 leading-relaxed">{t(doc.desc)}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="bg-blue-500/5 border border-blue-500/20 p-4 rounded-2xl text-xs text-blue-400 leading-relaxed flex items-start gap-2.5">
                      <Volume2 size={16} className="shrink-0 text-blue-400 mt-0.5" />
                      <div>
                        <strong>💡 {lang === "ar" ? "نصيحة هامة بخصوص التمويل:" : "Règle absolue des caisses de devises :"}</strong>{" "}
                        {lang === "ar" ? "تطلب السلطات الإسبانية إيداعات كافية تساوي مؤشر IPREM (حالياً حوالي 600 يورو شهرياً). يُفضل تفعيل كفالة الأب أو الأم بتقديم كشف حساب مصرفي يغطي آخر 6 أشهر مع ترجمة الضمان المالي." :
                         "L'IPREM espagnol exige au minimum 600€ par mois pour les étudiants. Pour renforcer votre demande, joignez les relevés bancaires d'un garant direct couvrant 6 mois."}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* TAB 3: STUDY PROGRAMS EXPLORER */}
          {tab === "formations" && (
            <div className="bg-[#0c1222] border border-[#1b253b] p-6 rounded-3xl shadow-xl">
              <div className="mb-5">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <BookOpen className="text-amber-500" />
                  {lang === "ar" ? "استكشاف البرامج الدراسية وتكاليفها" : "Formations & Programmes Pratiques"}
                </h2>
                <p className="text-xs text-gray-400 mt-1">
                  {lang === "ar" ? "تفاصيل التكوين المهني والجامعات من حيث القبول والآفاق المهنية" : "Consultez les conditions requises para chaque niveau : conditions de diplôme ou bourses."}
                </p>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
                <div className="flex gap-2 flex-wrap">
                  {Object.keys(FORMATIONS).map(key => (
                    <button
                      key={key}
                      onClick={() => setFormationTab(key)}
                      className={`px-4 py-2 text-xs font-semibold rounded-xl focus:outline-none transition-colors ${formationTab === key ? 'bg-amber-500 text-gray-900 font-bold' : 'text-gray-400 hover:text-white bg-gray-800/40'}`}
                    >
                      {t((FORMATIONS as any)[key])}
                    </button>
                  ))}
                </div>

                <div className="relative max-w-xs w-full">
                  <input 
                    type="text" 
                    placeholder={
                      lang === "ar" ? "ابحث عن قسيمة أو تخصص..." :
                      lang === "es" ? "Buscar especialidad o salida..." :
                      lang === "en" ? "Search specialty or career..." :
                      "Rechercher une spécialité..."
                    }
                    value={formationsSearch}
                    onChange={(e) => setFormationsSearch(e.target.value)}
                    className="w-full bg-[#070a13] border border-gray-800 rounded-xl pl-9 pr-4 py-1.5 text-xs text-white outline-none focus:border-amber-500 transition-colors"
                  />
                  <span className="absolute left-3 top-2 text-gray-500 text-xs">🔍</span>
                </div>
              </div>

              {(() => {
                const f = (FORMATIONS as any)[formationTab];
                return (
                  <div className="space-y-6">
                    <div className="p-5 bg-[#070a13] border border-[#1b253b] rounded-2xl flex flex-col md:flex-row justify-between gap-4">
                      <div>
                        <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">{f.tag} Category</span>
                        <h3 className="text-base font-bold text-white mt-1.5">{t(f)}</h3>
                        <p className="text-xs text-gray-400 mt-1 max-w-md">
                          {lang === "ar" ? "مسارات منسقة للمواءمة مع متطلبات سوق العمل المحلي الإسباني" : "Diplômes hautement appréciés par les entreprises ibériques."}
                        </p>
                      </div>
                      <div className="space-y-1.5 shrink-0 text-left md:text-right font-mono text-xs">
                        <div><span className="text-gray-500 uppercase mr-2">Duración:</span> <span className="text-white font-bold">{t(f.duration)}</span></div>
                      </div>
                    </div>

                    <div className="p-5 bg-gray-900/40 border border-gray-800 rounded-2xl">
                      <h4 className="text-xs font-bold text-[#94a3b8] uppercase tracking-wider mb-3">
                        {lang === "ar" ? "شروط التسجيل والقبول الإلزامية:" : "Conditions réglementaires pour postuler :"}
                      </h4>
                      <ul className="space-y-2">
                        {f.access.map((acc: string, i: number) => (
                          <li key={i} className="text-xs text-gray-300 flex items-start gap-2">
                            <span className="text-amber-500 mt-0.5">✔</span>
                            <span>{acc}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {f.note && (
                      <div className="bg-amber-500/5 text-amber-400 border border-amber-500/20 p-4 rounded-xl text-xs">
                        <strong>💡 Highlight:</strong> {t(f.note)}
                      </div>
                    )}

                    {f.families && (() => {
                      const filteredFamilies = f.families.filter((fam: any) => {
                        const s = formationsSearch.toLowerCase();
                        const nameMatch = t(fam.name).toLowerCase().includes(s);
                        const salidasMatch = fam.salidas[lang as "es" | "fr" | "ar" | "en"]?.some((sal: string) => sal.toLowerCase().includes(s)) || false;
                        return nameMatch || salidasMatch;
                      });

                      if (filteredFamilies.length === 0) {
                        return (
                          <div className="text-center py-8 text-gray-500 text-xs border border-[#1b253b] border-dashed rounded-2xl bg-[#070a13]/50">
                            {lang === "ar" ? "لم يتم العثور على تخصصات تطابق بحثك." : 
                             lang === "es" ? "No se encontraron especialidades que coincidan con tu búsqueda." : 
                             lang === "en" ? "No specialties found matching your search." :
                             "Aucune spécialité ne correspond à votre recherche."}
                          </div>
                        );
                      }

                      return (
                        <div>
                          <h4 className="text-xs font-bold text-[#94a3b8] uppercase tracking-wider mb-4 font-sans">
                            {lang === "ar" ? "العائلات المهنية المتاحة وآفاق العمل:" :
                             lang === "es" ? "Especialidades Recomendadas y Salidas Profesionales:" :
                             lang === "en" ? "Recommended Specialties & Career Prospects:" :
                             "Spécialités Majeures Recommandées & Débouchés :"}
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {filteredFamilies.map((fam: any, idx: number) => (
                              <div 
                                key={idx} 
                                onClick={() => setSelectedSpecialty(fam)}
                                className="bg-[#070a13] border border-[#1b253b] hover:border-amber-500/40 p-4 rounded-2xl flex flex-col justify-between cursor-pointer transition-all duration-300 hover:shadow-lg hover:shadow-amber-500/5 group"
                              >
                                <div>
                                  <h5 className="font-bold text-xs text-white mb-3 tracking-tight border-b border-gray-800 pb-2 group-hover:text-amber-300 transition-colors">{t(fam.name)}</h5>
                                  <div className="space-y-2">
                                    <span className="text-[10px] text-gray-500 uppercase tracking-wider block">
                                      {lang === "ar" ? "الوظائف والفرص:" :
                                       lang === "es" ? "Puestos y salidas:" :
                                       lang === "en" ? "Careers & profiles:" :
                                       "Métiers & Profils :"}
                                    </span>
                                    <div className="flex gap-1.5 flex-wrap">
                                      {fam.salidas[lang as "es" | "fr" | "ar" | "en"]?.map((sal: string, sIdx: number) => {
                                        const isHighlighted = formationsSearch && sal.toLowerCase().includes(formationsSearch.toLowerCase());
                                        return (
                                          <span key={sIdx} className={`text-[10px] px-2 py-1 rounded-lg border transition-colors ${
                                            isHighlighted 
                                              ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-medium' 
                                              : 'bg-gray-800 border-gray-700/60 text-gray-300 group-hover:border-gray-600/80'
                                          }`}>
                                            {sal}
                                          </span>
                                        );
                                      })}
                                    </div>
                                  </div>
                                </div>
                                <div className="mt-4 pt-3 border-t border-gray-800/60 flex justify-between items-center text-[10px] text-amber-500/80 group-hover:text-amber-400 font-medium transition-colors">
                                  <span>
                                    {lang === "ar" ? "اضغط لعرض ما يدرس بالتفصيل ➔" :
                                     lang === "es" ? "Ver detalles y asignaturas ➔" :
                                     lang === "en" ? "View curriculum & modules ➔" :
                                     "Voir les matières enseignées ➔"}
                                  </span>
                                  <span className="text-xs">✦</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                );
              })()}

              {/* 100-QUESTION FUN CAREER PATH QUIZ */}
              <div id="career-quiz-section" className="mt-8 pt-8 border-t border-[#1b253b] space-y-6">
                {!quizActive ? (
                  <div className="bg-gradient-to-br from-[#0c1222] to-[#12192b] border-2 border-dashed border-amber-500/20 p-6 rounded-2xl text-center space-y-4">
                    <div className="mx-auto w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center text-xl text-amber-400 animate-pulse">
                      🎯
                    </div>
                    <div className="max-w-xl mx-auto space-y-2">
                      <h3 className="text-lg font-bold text-white">
                        {lang === "ar" ? "🎯 اختبار التوجيه المهني الكبير (100 سؤال) لإسبانيا" : 
                         lang === "fr" ? "🎯 Le Grand Test d'Orientation Pro (100 Questions) - Espagne" :
                         lang === "es" ? "🎯 El Gran Test de Orientación de 100 Preguntas en España" :
                         "🎯 The Great 100-Question Orientation Test for Spain"}
                      </h3>
                      <p className="text-xs text-gray-400 leading-relaxed font-sans">
                        {lang === "ar" ? "أجب عن اختبار مرح وتفاعلي من 100 سؤال قصير ومدروس يقيس مهاراتك وميولك، لتحديد التخصص المهني أو رخصة العمل في إسبانيا التي تلائمك مع توضيح كامل لآفاق العمل والرواتب." :
                         lang === "fr" ? "Répondez à un test amusant de 100 questions rapides pour évaluer vos affinités professionnelles et découvrir quelle formation, licence ou diplôme réglementé espagnol correspond le mieux à vos talents." :
                         lang === "es" ? "Participa en un divertido test interactivo de exactamente 100 preguntas sobre tus intereses. Determina qué formación profesional, grado de licencia comercial o sector laboral en España se adapta mejor a tu personalidad y salidas comerciales." :
                         "Participate in a fun interactive test of exactly 100 questions. Determine which Spanish professional training, commercial licenses, or career fields match your skills and job market prospects."}
                      </p>
                    </div>

                    <div className="bg-emerald-500/10 border border-emerald-500/20 p-3.5 rounded-xl text-left max-w-xl mx-auto space-y-1">
                      <p className="text-[11px] text-emerald-400 font-bold flex items-center gap-1.5">
                        🛡️ {lang === "ar" ? "التزام بالراحة والخصوصية التامة:" : 
                             lang === "fr" ? "Confidentialité & Confort de l'Apprenant :" : 
                             "Garantía de Respeto, Comodidad y Privacidad:"}
                      </p>
                      <p className="text-[10px] text-gray-300 leading-normal font-sans">
                        {lang === "ar" ? "جميع أسئلة هذا الاختبار مهنية وأكاديمية ومصممة لمساعدتك على التوجيه بامتياز. نلتزم التزاماً صارماً بتجنب أي أسئلة شخصية، محرجة، غير ملائمة أو غير مريحة للمستخدم." :
                         lang === "fr" ? "Toutes les questions sont purement orientatives, académiques et neutres. Nous interdisons toute question indiscrète, personnelle ou inconfortable afin de vous garantir une expérience sereine." :
                         "Todas las preguntas de este test son estrictamente de carácter educativo, profesional y orientativo. No recopilamos datos sensibles ni formulamos preguntas de índole privada, incómoda o personal."}
                      </p>
                    </div>

                    <button
                      onClick={() => {
                        setQuizActive(true);
                        setQuizIndex(0);
                        setQuizAnswers(Array(100).fill(-1));
                      }}
                      className="px-6 py-3 bg-amber-500 text-gray-950 font-extrabold text-xs tracking-wider uppercase rounded-xl hover:bg-amber-400 hover:scale-[1.02] active:scale-95 transition-all shadow-lg cursor-pointer inline-block"
                    >
                      🚀 {lang === "ar" ? "ابدأ اختبار التوجيه للتكوين والعمل" : "¡Empezar Test de Orientación!"}
                    </button>
                  </div>
                ) : quizIndex < 100 ? (
                  (() => {
                    const qObj = HUNDRED_QUESTIONS[quizIndex];
                    const progressVal = Math.round(((quizIndex) / 100) * 100);
                    
                    return (
                      <div className="bg-[#070a13] border border-[#1b253b] p-6 rounded-2xl space-y-5 relative overflow-hidden">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-mono text-gray-500 uppercase tracking-widest text-[9px]">
                            {lang === "ar" ? `قسم: ${qObj.category.toUpperCase()}` : `SECCIÓN DE INTERÉS: ${qObj.category.toUpperCase()}`}
                          </span>
                          <span className="font-mono font-bold text-amber-400">
                            {lang === "ar" ? `${quizIndex + 1} / 100 سؤال` : `Pregunta ${quizIndex + 1} de 100`}
                          </span>
                        </div>

                        <div className="w-full bg-gray-800 h-2.5 rounded-full overflow-hidden">
                          <div 
                            className="bg-gradient-to-r from-amber-500 to-amber-300 h-full rounded-full transition-all duration-350"
                            style={{ width: `${progressVal}%` }}
                          />
                        </div>

                        <div className="bg-[#0c1222] border border-gray-800 p-6 rounded-2xl text-center min-h-[100px] flex items-center justify-center animate-fade-in">
                          <p className="text-sm md:text-base font-bold text-white tracking-wide leading-relaxed select-none">
                            {lang === "ar" ? qObj.ar : lang === "fr" ? qObj.fr : lang === "en" ? qObj.en : qObj.es}
                          </p>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-3">
                          <button
                            onClick={() => {
                              const newAns = [...quizAnswers];
                              newAns[quizIndex] = 5;
                              setQuizAnswers(newAns);
                              setQuizIndex(prev => prev + 1);
                            }}
                            className="flex-1 py-3 px-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/20 text-emerald-450 text-xs font-bold transition-all flex items-center justify-center gap-2 active:scale-95 cursor-pointer"
                          >
                            🟢 {lang === "ar" ? "نعم، أوافق بشدة" : lang === "fr" ? "Oui, totalement d'accord" : "Sí, totalmente de acuerdo"}
                          </button>

                          <button
                            onClick={() => {
                              const newAns = [...quizAnswers];
                              newAns[quizIndex] = 2;
                              setQuizAnswers(newAns);
                              setQuizIndex(prev => prev + 1);
                            }}
                            className="flex-1 py-3 px-4 rounded-xl bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 text-amber-300 text-xs font-bold transition-all flex items-center justify-center gap-2 active:scale-95 cursor-pointer"
                          >
                            🟡 {lang === "ar" ? "محايد / أحياناً" : lang === "fr" ? "Neutre / Parfois" : "Neutro / A veces"}
                          </button>

                          <button
                            onClick={() => {
                              const newAns = [...quizAnswers];
                              newAns[quizIndex] = 0;
                              setQuizAnswers(newAns);
                              setQuizIndex(prev => prev + 1);
                            }}
                            className="flex-1 py-3 px-4 rounded-xl bg-rose-500/10 border border-rose-500/30 hover:bg-rose-500/20 text-rose-350 text-xs font-bold transition-all flex items-center justify-center gap-2 active:scale-95 cursor-pointer"
                          >
                            🔴 {lang === "ar" ? "لا، لا أوافق أبداً" : lang === "fr" ? "Pas d'accord" : "No, en absoluto"}
                          </button>
                        </div>

                        <div className="flex justify-between items-center pt-3 border-t border-gray-800 text-[10px] text-gray-500 font-sans">
                          <button
                            disabled={quizIndex === 0}
                            onClick={() => setQuizIndex(prev => Math.max(0, prev - 1))}
                            className="flex items-center gap-1 hover:text-white disabled:opacity-40 disabled:hover:text-gray-500 transition-colors"
                          >
                            ← {lang === "ar" ? "السابق" : "Anterior / Back"}
                          </button>

                          <button
                            onClick={() => {
                              const filled = quizAnswers.map((val, idx) => {
                                if (idx < quizIndex) return val;
                                const arr = [0, 2, 5];
                                return arr[Math.floor(Math.random() * arr.length)];
                              });
                              setQuizAnswers(filled);
                              setQuizIndex(100);
                            }}
                            className="text-amber-500/80 hover:text-amber-400 font-mono underline"
                          >
                            ⚡ {lang === "ar" ? "تعبئة تلقائية سريعة للاختبار (معاينة)" : "Rellenar respuestas restantes (Simular)"}
                          </button>

                          <button
                            onClick={() => {
                              setQuizActive(false);
                            }}
                            className="hover:text-rose-400 font-medium"
                          >
                            ❌ {lang === "ar" ? "إلغاء وجدول" : "Cancelar / Reset"}
                          </button>
                        </div>
                      </div>
                    );
                  })()
                ) : (
                  (() => {
                    let tech = 0, health = 0, business = 0, hospitality = 0, creative = 0;
                    HUNDRED_QUESTIONS.forEach((q, idx) => {
                      const uAns = quizAnswers[idx];
                      if (uAns > 0) {
                        if (q.category === "tech") tech += uAns;
                        else if (q.category === "health") health += uAns;
                        else if (q.category === "business") business += uAns;
                        else if (q.category === "hospitality") hospitality += uAns;
                        else if (q.category === "creative") creative += uAns;
                      }
                    });

                    const scores = [
                      { key: "tech" as const, val: tech, label: CAREER_CATEGORIES.tech, color: "from-blue-600 to-indigo-500", textCol: "text-blue-400" },
                      { key: "health" as const, val: health, label: CAREER_CATEGORIES.health, color: "from-emerald-600 to-green-500", textCol: "text-emerald-400" },
                      { key: "business" as const, val: business, label: CAREER_CATEGORIES.business, color: "from-amber-600 to-orange-500", textCol: "text-amber-400" },
                      { key: "hospitality" as const, val: hospitality, label: CAREER_CATEGORIES.hospitality, color: "from-rose-600 to-red-500", textCol: "text-rose-400" },
                      { key: "creative" as const, val: creative, label: CAREER_CATEGORIES.creative, color: "from-purple-600 to-pink-500", textCol: "text-purple-400" }
                    ];

                    const sortedScores = [...scores].sort((a, b) => b.val - a.val);
                    const best = sortedScores[0];

                    return (
                      <div className="bg-[#070a13] border-2 border-emerald-500/20 p-6 rounded-2xl space-y-6">
                        <div className="text-center space-y-2">
                          <span className="inline-block text-[10px] bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-3 py-1 rounded-full uppercase tracking-widest font-mono font-bold">
                            🎓 {lang === "ar" ? "تقرير التوجيه المهني الشامل" : "Informe de Aptitud Académica & Salidas"}
                          </span>
                          <h3 className="text-xl font-bold text-white leading-tight">
                            {lang === "ar" ? "🏆 ملفك المهني السائد والموصى به في إسبانيا" : "🏆 Tu Perfil Vocacional Recomendado para España"}
                          </h3>
                        </div>

                        <div className="bg-[#0c1222] border border-emerald-500/30 p-5 rounded-2xl relative overflow-hidden space-y-2.5">
                          <div className="absolute right-0 top-0 text-[100px] leading-none text-emerald-500/5 select-none font-extrabold pr-2 pt-1 font-mono">
                            {best.val}%
                          </div>
                          
                          <h4 className="text-emerald-400 font-extrabold font-sans text-base">
                            {lang === "ar" ? best.label[lang] : best.label.es}
                          </h4>
                          
                          <div className="inline-block bg-white/5 border border-white/10 text-white rounded-lg px-2.5 py-1 text-[11px] font-mono leading-none">
                            🎯 {best.label.recommendation.title}
                          </div>

                          <p className="text-xs text-gray-300 leading-relaxed font-sans pt-1">
                            {lang === "ar" ? best.label.recommendation[lang] : 
                             lang === "fr" ? best.label.recommendation.fr : 
                             lang === "en" ? best.label.recommendation.en : 
                             best.label.recommendation.es}
                          </p>
                        </div>

                        <div className="space-y-3.5">
                          <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest font-mono">
                            {lang === "ar" ? "توزيع نقاط التوافق حسب كل عائلة مهنية (100% كحد أقصى):" : "Desglose de Compatibilidad por Categorías:"}
                          </h4>

                          <div className="space-y-3 font-sans">
                            {scores.map((s, idx) => {
                              const isTop = s.key === best.key;
                              return (
                                <div key={idx} className="space-y-1.5">
                                  <div className="flex justify-between items-center text-xs">
                                    <span className={`${isTop ? "text-white font-bold" : "text-gray-400"} flex items-center gap-1.5`}>
                                      {isTop ? "⭐" : "•"} {lang === "ar" ? s.label[lang] : s.label.es}
                                    </span>
                                    <span className={`font-mono font-bold ${s.textCol}`}>{s.val}%</span>
                                  </div>
                                  <div className="w-full bg-gray-900 h-2.5 rounded-full overflow-hidden border border-gray-800">
                                    <div 
                                      className={`bg-gradient-to-r ${s.color} h-full rounded-full transition-all duration-500`}
                                      style={{ width: `${s.val}%` }}
                                    />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        <div className="pt-4 border-t border-gray-800 flex justify-center">
                          <button
                            onClick={() => {
                              setQuizAnswers(Array(100).fill(-1));
                              setQuizIndex(0);
                              setQuizActive(true);
                            }}
                            className="bg-gray-800 hover:bg-gray-700 text-gray-300 px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                          >
                            🔄 {lang === "ar" ? "إعادة تشغيل الاختبار من جديد" : "Repetir el Test Vocacional"}
                          </button>
                        </div>
                      </div>
                    );
                  })()
                )}
              </div>
            </div>
          )}

          {/* TAB 4: CITY TRANSPORT SYSTEM */}
          {tab === "transport" && (
            <div className="bg-[#0c1222] border border-[#1b253b] p-6 rounded-3xl shadow-xl">
              <div className="mb-5 flex justify-between items-center flex-wrap gap-2">
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <Train className="text-amber-500" />
                    {lang === "ar" ? "بطاقات النقل المخفضة للطلاب" : "Tarification Joven & Cartes Mensuelles de Métro"}
                  </h2>
                  <p className="text-xs text-gray-400 mt-1">
                    {lang === "ar" ? "تأمين التنقل بأقل تكلفة للطلاب دون سن 26 أو 30 عاماً" : "Toutes les offres de transports publics adaptées aux budgets étudiants."}
                  </p>
                </div>
                <input 
                  type="text" 
                  placeholder="Filtrer par ville..."
                  value={transportSearch}
                  onChange={(e) => setTransportSearch(e.target.value)}
                  className="bg-[#070a13] border border-gray-800 rounded-xl px-3 py-1.5 text-xs text-white outline-none focus:border-amber-500 max-w-[200px]"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {TRANSPORT
                  .filter(tItem => tItem.city.toLowerCase().includes(transportSearch.toLowerCase()))
                  .map((tItem, idx) => (
                    <div key={idx} className="bg-[#070a13] border border-[#1b253b] p-5 rounded-2xl space-y-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-bold text-white text-base mt-1">{tItem.city} — {tItem.card}</h4>
                        </div>
                        <span className="bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] font-mono px-2 py-0.5 rounded uppercase font-bold">
                          {tItem.age}
                        </span>
                      </div>

                      <p className="text-xs text-gray-400 leading-relaxed font-sans">{t(tItem.cover)}</p>

                      <div className="border-t border-gray-800/80 pt-3 space-y-1.5">
                        <span className="text-[10px] text-gray-500 uppercase font-mono">Comment postuler / Requis :</span>
                        <p className="text-xs text-gray-300 leading-relaxed">{t(tItem.apply)}</p>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* TAB 5: HOUSING PORTAL */}
          {tab === "logement" && (
            <div className="bg-[#0c1222] border border-[#1b253b] p-6 rounded-3xl shadow-xl">
              <div className="mb-5">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Home className="text-amber-500" />
                  {lang === "ar" ? "دليل السكن والعيش الآمن" : "Logement & Locations en Espagne - Éviter les Estafas"}
                </h2>
                <p className="text-xs text-gray-400 mt-1">
                  {lang === "ar" ? "اعثر على سكن بدون غش مع إرشادات التأكد من صحة العروض" : "Trouvez votre logement étudiant en évitant impérativement les arnaques."}
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {LOGEMENT.map((l, index) => (
                  <div key={index} className="bg-[#070a13] border border-[#1b253b] p-5 rounded-2xl flex flex-col md:flex-row justify-between gap-4 hover:border-amber-500/30 transition-all">
                    <div className="space-y-1.5">
                      <span className="bg-amber-500/5 text-amber-400 border border-amber-500/20 text-[10px] font-mono uppercase px-2 py-0.5 rounded">
                        {t(l.type)}
                      </span>
                      <h4 className="font-bold text-white text-sm">{t(l.name)}</h4>
                      <p className="text-xs text-gray-400 max-w-xl leading-relaxed">{t(l.desc)}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-[#070a13] border border-[#1b253b] p-6 rounded-2xl mt-6 space-y-4">
                <div>
                  <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                    <Globe size={18} className="text-amber-500 animate-pulse" />
                    {lang === "ar" ? "منصات البحث المباشر عن الإيجار المعتمدة:" : "Plataformas de Alquiler en España (Idealista & Fotocasa)"}
                  </h3>
                  <p className="text-xs text-gray-400 mt-1">
                    {lang === "ar" ? "روابط مباشرة لشاشات الطلبة وشرح تفصيلي لطريقة الاستخدام الصحيحة:" : "Accédez directement aux sites officiels et découvrez comment maximiser vos chances."}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <a 
                    href="https://www.idealista.com/" 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="flex items-center justify-between p-4 bg-[#0c1222] border border-[#1b253b] hover:border-amber-500/40 rounded-xl group transition-all"
                  >
                    <div className="space-y-1">
                      <span className="text-[10px] text-amber-500 font-mono font-bold uppercase tracking-wider block">Estancia & Pisos</span>
                      <h4 className="text-white font-bold text-sm flex items-center gap-1.5 group-hover:text-amber-400 transition-colors">
                        Idealista.com 🔗
                      </h4>
                      <p className="text-[10px] text-gray-400 leading-tight">
                        {lang === "ar" ? "المنصة الكبرى رقم 1 في إسبانيا للبحث عن غرف وشقق مشتركة." : "Le portail n°1 en Espagne pour chercher des chambres (pisos compartidos)."}
                      </p>
                    </div>
                  </a>

                  <a 
                    href="https://www.fotocasa.es/" 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="flex items-center justify-between p-4 bg-[#0c1222] border border-[#1b253b] hover:border-amber-500/40 rounded-xl group transition-all"
                  >
                    <div className="space-y-1">
                      <span className="text-[10px] text-amber-500 font-mono font-bold uppercase tracking-wider block">Alquiler & Habitaciones</span>
                      <h4 className="text-white font-bold text-sm flex items-center gap-1.5 group-hover:text-amber-400 transition-colors">
                        Fotocasa.es 🔗
                      </h4>
                      <p className="text-[10px] text-gray-400 leading-tight">
                        {lang === "ar" ? "خدمة متميزة وفلاتر بالغة الدقة للحي ونطاق الميزانية المحددة." : "Filtres avancés par quartier et budget idéal pour colocations."}
                      </p>
                    </div>
                  </a>
                </div>

                <div className="border-t border-[#1b253b] pt-4">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-2.5">
                    {lang === "ar" ? "كيف تعمل المنصات وتضمن قبول طلبك؟" : "¿Cómo funcionan estas plataformas y cómo buscar con éxito?"}
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-gray-300 leading-relaxed font-sans">
                    <div className="space-y-2 bg-[#0c1222]/40 p-3 rounded-lg border border-gray-800/45">
                      <p>
                        <strong>1. {lang === "ar" ? "تفعيل التنبيهات الفورية (Alertas):" : "Alertes instantanées :"}</strong>{" "}
                        {lang === "ar" ? "الغرف الجيدة تؤجر خلال ساعات قليلة. يجب تفعيل فلتر التنبيهات على البريد/الهاتف لتلقي تنبيه للمنشور فور صدوره والاتصال فورًا." : 
                         "Les meilleures chambres partent en quelques heures. Activez impérativement les alertes de recherche pour être informé à la minute de tout nouveau bien."}
                      </p>
                      <p>
                        <strong>2. {lang === "ar" ? "الاتصال المباشر أفضل من الرسائل:" : "Contacter par Email :"}</strong>{" "}
                        {lang === "ar" ? "يفضل دائمًا الاتصال الهاتفي أو إرسال واتساب على الرقم المعلن عوضًا عن البريد الإلكتروني التقليدي للحصول على رد سريع." : 
                         "Contactez directement par email les professeurs pour toute question ou demande de cours."}
                      </p>
                    </div>
                    <div className="space-y-2 bg-[#0c1222]/40 p-3 rounded-lg border border-gray-800/45">
                      <p>
                        <strong>3. {lang === "ar" ? "تجهيز ملف الملاءة (Solvencia):" : "Dossier de solvabilité :"}</strong>{" "}
                        {lang === "ar" ? "يطلب الملاك إثباتات مالية (كفالة الوالدين أو منحة). جهّز ملفاتك مترجمة لتسليمها مباشرة لإغلاق الاتفاق بنجاح." :
                         "Les propriétaires demandent souvent des garanties (garant ou bourse). Préparez vos documents traduits à l'avance pour finaliser rapidement."}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: SPANISH COURSES & ASSESSMENTS */}
          {tab === "ebook" && (
            <div className="space-y-6">
              
              {/* LEVEL SWAP HEADERS CONTAINER */}
              <div className="bg-[#0c1222] border border-[#1b253b] p-4 rounded-3xl shadow-md flex items-center justify-between flex-wrap gap-3">
                <div className="flex gap-1.5 flex-wrap">
                  {["A1", "A2", "B1", "B2", "C1", "C2"].map(lvl => {
                    const active = selectedLevel === lvl;
                    const isUserLevel = profile.level === lvl;
                    return (
                      <button
                        key={lvl}
                        onClick={() => {
                          setSelectedLevel(lvl);
                          setCurrentPage(getMinPage(lvl));
                          setExamActive(false);
                        }}
                        className={`px-4 py-2 text-xs font-bold font-mono rounded-xl transition-all uppercase flex items-center gap-1.5 cursor-pointer ${
                          active 
                            ? 'bg-amber-500 text-gray-950 scale-105 shadow-md' 
                            : 'bg-[#070a13] text-gray-400 hover:text-white border border-gray-800'
                        }`}
                      >
                        <span>{lvl}</span>
                        {isUserLevel && <span className="text-[9px] bg-emerald-500 text-white px-1 py-0.2 rounded uppercase tracking-tighter">Tu Nivel</span>}
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      setExamActive(true);
                      handleLoadExam(1);
                    }}
                    className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border ${
                      examActive 
                        ? 'bg-amber-500 text-gray-950 border-amber-400' 
                        : 'bg-gradient-to-r from-blue-600/20 to-indigo-600/20 text-blue-300 border-blue-500/30 hover:border-blue-400'
                    }`}
                  >
                    <span>🏆 {lang === "ar" ? "امتحان ترقية المستوى الرسمي" : "Examen de Ascenso CEFR"}</span>
                  </button>
                </div>
              </div>

              {/* ROUTER PANEL: STANDARD LESSON OR ADVANCEMENT EXAMINATION */}
              {!examActive ? (
                // VIEW A: LIVE INTERACTIVE HANDBOOK LESSON
                <div className="bg-[#0c1222] border border-[#1b253b] p-6 rounded-3xl shadow-xl space-y-6">
                  
                  {/* Paginator header control */}
                  <div className="flex justify-between items-center bg-[#070a13] p-3 border border-gray-800/80 rounded-2xl flex-wrap gap-3">
                    <div className="flex items-center gap-2">
                      <button
                        disabled={currentPage === getMinPage(selectedLevel)}
                        onClick={() => setCurrentPage(p => Math.max(getMinPage(selectedLevel), p - 1))}
                        className="p-1.5 bg-gray-800 hover:bg-gray-700 disabled:opacity-40 rounded-lg text-white font-bold text-xs"
                      >
                        <ChevronLeft size={16} />
                      </button>
                      <span className="text-xs text-gray-300 font-mono font-bold uppercase">
                        {lang === "ar" ? `الصفحة ${currentPage} من ${getMaxPage(selectedLevel)}` : `PÁGINA ${currentPage} DE ${getMaxPage(selectedLevel)}`}
                      </span>
                      <button
                        disabled={currentPage === getMaxPage(selectedLevel)}
                        onClick={() => setCurrentPage(p => Math.min(getMaxPage(selectedLevel), p + 1))}
                        className="p-1.5 bg-gray-800 hover:bg-gray-700 disabled:opacity-40 rounded-lg text-white font-bold text-xs"
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>

                    <div className="text-xs text-amber-400 font-medium tracking-tight">
                      📖 {lang === "ar" ? "الموضوع:" : "Tema Central:"} <strong className="text-white font-mono">{getTopic(selectedLevel, currentPage)}</strong>
                    </div>

                    {isOfflineMode && (
                      <span className="text-[10px] bg-amber-500/10 border border-amber-500/20 text-amber-400 px-2.5 py-0.5 rounded font-mono uppercase font-bold tracking-wider">
                        Local Handbook Mode
                      </span>
                    )}
                  </div>

                  {loadingLesson ? (
                    <div className="text-center py-20 space-y-3">
                      <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                      <p className="text-xs text-gray-400 font-mono">Consolidando estructura gramatical e imágenes...</p>
                    </div>
                  ) : lessonData ? (
                    <div className="space-y-6 animate-fade-in">
                      
                      {/* Sub-Section 1: Vocabulary Cards */}
                      <div className="bg-[#070a13] border border-gray-800/70 p-5 rounded-2xl space-y-4">
                        <div className="flex justify-between items-center">
                          <h3 className="text-sm font-extrabold text-white uppercase tracking-wider flex items-center gap-1.5">
                            <Volume2 size={15} className="text-amber-500" />
                            {lang === "ar" ? "مفردات ومصطلحات اليوم مع النطق بالصوت:" : "Vocabulario Clave & Pronunciación Interactiva"}
                          </h3>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {(lessonData.vocabulary || []).map((v: any, i: number) => (
                            <div 
                              key={i}
                              onClick={() => speakSpanish(v.es)}
                              title="Click to hear pronunciation by native voice"
                              className="bg-[#0c1222] border border-[#1b253b] hover:border-amber-500/30 p-3 rounded-xl flex items-center justify-between cursor-pointer transition-all group"
                            >
                              <div>
                                <span className="text-xs font-bold text-white group-hover:text-amber-400 transition-colors block">{v.es}</span>
                                <span className="text-[11px] text-gray-400 mt-0.5 block italic">{v.tr}</span>
                              </div>
                              <span className="text-xs bg-gray-800 group-hover:bg-amber-500 group-hover:text-gray-900 p-1.5 rounded-lg transition-colors text-gray-400">
                                🔊
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Sub-Section 2: Grammatical Handbook Content */}
                      <div className="p-5 bg-gradient-to-b from-gray-900/60 to-gray-900/10 border border-gray-800/60 rounded-2xl leading-relaxed">
                        <h3 className="text-sm font-extrabold text-white uppercase tracking-wider mb-3 font-sans">
                          {lang === "ar" ? "الشرح النظري والقواعد المبسطة:" : "Explicación Teórica Gramatical"}
                        </h3>
                        <div className="text-xs text-gray-300 space-y-3 markdown-container font-sans">
                          <ReactMarkdown>{lessonData.grammar || "Contenido de lección cargando..."}</ReactMarkdown>
                        </div>
                      </div>

                      {/* Sub-Section 3: Interactive Practice Area */}
                      {lessonData.practice && lessonData.practice.length > 0 && (
                        <div className="border-t border-gray-800 pt-5 space-y-4">
                          <h3 className="text-sm font-extrabold text-white uppercase tracking-wider flex items-center gap-1.5">
                            <Award size={15} className="text-amber-500" />
                            {lang === "ar" ? "تمارين تطبيقية فورية كسب النقاط (+15 XP):" : "Retos Prácticos de Consolidación (+15 XP)"}
                          </h3>

                          <div className="space-y-4">
                            {lessonData.practice.map((q: any, i: number) => {
                              const result = exResults[i];
                              const userAns = exAnswers[i] || "";

                              return (
                                <div key={i} className="bg-[#070a13] border border-[#1b253b] p-4 rounded-xl space-y-3">
                                  <p className="text-xs text-gray-200 font-medium">
                                    <strong>Ejercicio {i + 1}:</strong> {q.question}
                                  </p>

                                  {q.type === "multiple-choice" ? (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                                      {q.options?.map((opt: string, optIdx: number) => (
                                        <button
                                          key={optIdx}
                                          disabled={!!result}
                                          onClick={() => {
                                            setExAnswers(prev => ({ ...prev, [i]: optIdx }));
                                            handleVerifyExercise(i, String(optIdx), q.correct, "multiple-choice");
                                          }}
                                          className={`text-left p-2.5 rounded-lg text-xs transition-colors border cursor-pointer ${
                                            Number(userAns) === optIdx 
                                              ? 'bg-amber-500 text-gray-950 font-bold border-amber-400' 
                                              : 'bg-[#0c1222] text-gray-300 border-gray-800 hover:border-gray-700'
                                          }`}
                                        >
                                          {opt}
                                        </button>
                                      ))}
                                    </div>
                                  ) : (
                                    <div className="flex gap-2">
                                      <input 
                                        type="text"
                                        placeholder={q.type === "translation" ? "Escribe la traducción aquí..." : "Completa la palabra faltante..."}
                                        disabled={!!result}
                                        value={userAns}
                                        onChange={(e) => setExAnswers(prev => ({ ...prev, [i]: e.target.value }))}
                                        className="bg-[#0c1222] border border-gray-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-amber-500 flex-1"
                                      />
                                      <button
                                        disabled={!!result || !userAns.trim()}
                                        onClick={() => handleVerifyExercise(i, userAns, q.correct, q.type)}
                                        className="bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-gray-950 font-extrabold text-xs px-4 py-2 rounded-xl cursor-pointer transition-colors"
                                      >
                                        Verificar
                                      </button>
                                    </div>
                                  )}

                                  {result && (
                                    <div className={`p-3 rounded-xl text-xs font-medium font-sans leading-relaxed ${result.ok ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'}`}>
                                      {result.fb}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-10 text-xs text-gray-500 font-mono">
                      Error al estructurar handbook de lección. Cambia de página para reintentar.
                    </div>
                  )}
                </div>
              ) : (
                // VIEW B: LEVEL ADVANCEMENT EVALUATION ENGINE
                <div className="bg-[#0c1222] border-2 border-blue-500/30 p-6 rounded-3xl shadow-xl space-y-6">
                  <div className="flex justify-between items-center flex-wrap gap-3 border-b border-gray-800 pb-4">
                    <div>
                      <span className="text-[10px] uppercase font-mono font-bold tracking-widest text-blue-400">CEFR OFFICIAL ADVANCEMENT EXAM</span>
                      <h3 className="text-lg font-bold text-white mt-1">
                        {lang === "ar" ? `📋 اختبار الكفاءة لترقية المستوى إلى ${selectedLevel}` : `📋 Examen de Competencia para Certificar Nivel ${selectedLevel}`}
                      </h3>
                    </div>
                    <button
                      onClick={() => setExamActive(false)}
                      className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-bold rounded-xl transition-all"
                    >
                      ← Volver al Manual
                    </button>
                  </div>

                  {loadingExam ? (
                    <div className="text-center py-20 space-y-3">
                      <div className="w-8 h-8 border-4 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto"></div>
                      <p className="text-xs text-gray-400 font-mono">Generando examen de suficiencia oficial...</p>
                    </div>
                  ) : examData ? (
                    <div className="space-y-6 animate-fade-in">
                      
                      {/* Tarea/Section navigation tabs */}
                      <div className="flex gap-1.5 border-b border-gray-800 pb-2 overflow-x-auto">
                        {[1, 2, 3].map(tNum => {
                          const isCurrent = activeTarea === tNum;
                          return (
                            <button
                              key={tNum}
                              type="button"
                              onClick={() => setActiveTarea(tNum)}
                              className={`px-4 py-1.5 rounded-lg text-xs font-bold font-mono transition-colors ${
                                isCurrent 
                                  ? 'bg-blue-500 text-white font-extrabold shadow-sm' 
                                  : 'bg-[#070a13] text-gray-400 hover:text-white hover:bg-gray-800/40'
                              }`}
                            >
                              Tarea {tNum}
                            </button>
                          );
                        })}
                      </div>

                      {/* Filter questions pertaining to active task block */}
                      {(() => {
                        const targetCategory = activeTarea === 1 ? "comprension-lectura" : activeTarea === 2 ? "estructuras-gramaticales" : "situaciones-reales";
                        const categoryQuestions = (examData.questions || []).filter((q: any) => q.category === targetCategory);

                        return (
                          <div className="space-y-5">
                            <div className="p-3.5 bg-blue-500/5 text-blue-400 rounded-xl border border-blue-500/20 text-xs font-sans leading-relaxed">
                              📌 <strong>Instrucciones Tarea {activeTarea}:</strong>{" "}
                              {activeTarea === 1 ? "Comprensión de Textos Cortos. Lee atentamente y selecciona el significado más adecuado." :
                               activeTarea === 2 ? "Estructuras Gramaticales Avanzadas. Completa o reescribe formalmente la frase." :
                               "Comprensión de Situaciones e Interacciones Cotidianas en España."}
                            </div>

                            {categoryQuestions.map((q: any) => {
                              const globalIdx = (examData.questions || []).indexOf(q);
                              const answeredOpt = examAnswers[globalIdx];

                              return (
                                <div key={globalIdx} className="bg-[#070a13] border border-gray-800 p-5 rounded-2xl space-y-3">
                                  <p className="text-xs md:text-sm font-semibold text-white leading-relaxed">
                                    <span className="text-blue-400 font-mono font-bold mr-1">Q.{globalIdx + 1}</span>
                                    {q.text}
                                  </p>

                                  <div className="grid grid-cols-1 gap-2 pt-1 font-sans">
                                    {q.options?.map((opt: string, optIdx: number) => {
                                      const isSelected = answeredOpt === optIdx;
                                      const isCorrect = q.correctIndex === optIdx;
                                      
                                      let btnStyle = 'bg-[#0c1222] border-gray-800 text-gray-300 hover:border-gray-700';
                                      if (examSubmitted) {
                                        if (isCorrect) btnStyle = 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-bold';
                                        else if (isSelected) btnStyle = 'bg-rose-500/20 border-rose-500 text-rose-300';
                                      } else if (isSelected) {
                                        btnStyle = 'bg-blue-500/20 border-blue-500 text-blue-300 font-bold';
                                      }

                                      return (
                                        <button
                                          key={optIdx}
                                          type="button"
                                          disabled={examSubmitted}
                                          onClick={() => handleAnswerExam(globalIdx, optIdx)}
                                          className={`w-full text-left p-3 rounded-xl text-xs border transition-colors cursor-pointer flex items-center justify-between ${btnStyle}`}
                                        >
                                          <span>{opt}</span>
                                          {examSubmitted && isCorrect && <span className="text-emerald-400 font-bold text-xs">✓ Correcta</span>}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })()}

                      {/* Action trigger footer */}
                      <div className="pt-4 border-t border-gray-800 flex flex-col sm:flex-row justify-between items-center gap-4">
                        <p className="text-xs text-gray-400 font-sans">
                          {examSubmitted 
                            ? "Examen evaluado con éxito por el motor de IA." 
                            : `Preguntas contestadas: ${Object.keys(examAnswers).length} de ${(examData.questions || []).length}`}
                        </p>

                        {!examSubmitted ? (
                          <button
                            type="button"
                            onClick={handleSubmitExam}
                            disabled={Object.keys(examAnswers).length < (examData.questions || []).length}
                            className="px-6 py-3 bg-blue-500 hover:bg-blue-600 disabled:opacity-40 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl cursor-pointer shadow-lg transition-transform"
                          >
                            🔒 Entregar y Calificar Examen
                          </button>
                        ) : (
                          <div className="w-full sm:w-auto text-right space-y-2">
                            <div className="text-sm font-bold text-white">
                              Resultado:{" "}
                              <span className={examPassed ? "text-emerald-400" : "text-rose-400"}>
                                {examScore} / {(examData.questions || []).length} Aciertos ({examPassed ? "APROBADO" : "SUSPENDIDO"})
                              </span>
                            </div>
                            <p className="text-[11px] text-gray-400 max-w-sm ml-auto">
                              {examPassed 
                                ? "🎉 ¡Enhorabuena! Has sumado +100 XP. Si completas 3 exámenes válidos de este nivel, avanzarás de rango de manera automática." 
                                : "❌ No has alcanzado el 60% mínimo requerido. Has perdido -3 vidas. Repasa el manual interactivo antes de volver a presentarte."}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-10 text-xs text-gray-500 font-mono">
                      Error al renderizar la base del examen de suficiencia.
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 7: SPAIN PROFESSIONAL CV MAKER */}
          {tab === "cv" && (
            <div className="bg-[#0c1222] border border-[#1b253b] p-6 rounded-3xl shadow-xl">
              <div className="mb-5">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <FileText className="text-amber-500" />
                  {lang === "ar" ? "منشئ السيرة الذاتية المهنية لإسبانيا" : "Générateur de Curriculum Vitae - Normes Européennes"}
                </h2>
                <p className="text-xs text-gray-400 mt-1">
                  {lang === "ar" ? "أنشئ سيرتك الذاتية المتوافقة مع معايير العمل في إسبانيا بصيغة PDF جاهزة" : "Remplissez vos blocs de compétences pour concevoir un CV espagnol accrocheur."}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Form fields controls block */}
                <div className="space-y-4 bg-[#070a13] p-4 rounded-2xl border border-gray-800">
                  <div>
                    <label className="text-[10px] text-gray-400 uppercase font-mono block mb-1">Nombre y Apellido completo:</label>
                    <input 
                      type="text" 
                      value={cvData.name}
                      onChange={(e) => setCvData(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full bg-[#0c1222] border border-gray-800 rounded-xl p-2.5 text-xs text-white outline-none focus:border-amber-500"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] text-gray-400 uppercase font-mono block mb-1">Email de Contacto:</label>
                      <input 
                        type="email" 
                        value={cvData.email}
                        onChange={(e) => setCvData(prev => ({ ...prev, email: e.target.value }))}
                        className="w-full bg-[#0c1222] border border-gray-800 rounded-xl p-2.5 text-xs text-white outline-none focus:border-amber-500 font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-400 uppercase font-mono block mb-1">Ciudad Destino (España):</label>
                      <input 
                        type="text" 
                        value={cvData.city}
                        onChange={(e) => setCvData(prev => ({ ...prev, city: e.target.value }))}
                        className="w-full bg-[#0c1222] border border-gray-800 rounded-xl p-2.5 text-xs text-white outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-400 uppercase font-mono block mb-1">Puesto u Objetivo Profesional:</label>
                    <input 
                      type="text" 
                      value={cvData.role}
                      onChange={(e) => setCvData(prev => ({ ...prev, role: e.target.value }))}
                      className="w-full bg-[#0c1222] border border-gray-800 rounded-xl p-2.5 text-xs text-white outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-400 uppercase font-mono block mb-1">Formación Académica principal:</label>
                    <textarea 
                      rows={2}
                      value={cvData.edu}
                      onChange={(e) => setCvData(prev => ({ ...prev, edu: e.target.value }))}
                      className="w-full bg-[#0c1222] border border-gray-800 rounded-xl p-2.5 text-xs text-white outline-none focus:border-amber-500 font-sans"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-400 uppercase font-mono block mb-1">Competencias e Idiomas:</label>
                    <textarea 
                      rows={2}
                      value={cvData.skills}
                      onChange={(e) => setCvData(prev => ({ ...prev, skills: e.target.value }))}
                      className="w-full bg-[#0c1222] border border-gray-800 rounded-xl p-2.5 text-xs text-white outline-none focus:border-amber-500 font-sans"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-400 uppercase font-mono block mb-1">Experiencia Práctica / Proyectos de ejemplo:</label>
                    <textarea 
                      rows={3}
                      value={cvData.exp}
                      onChange={(e) => setCvData(prev => ({ ...prev, exp: e.target.value }))}
                      className="w-full bg-[#0c1222] border border-gray-800 rounded-xl p-2.5 text-xs text-white outline-none focus:border-amber-500 font-sans"
                    />
                  </div>

                  <button
                    onClick={handleGenerateCV}
                    disabled={cvGenerating}
                    className="w-full py-3 bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-gray-950 font-extrabold text-xs tracking-wider uppercase rounded-xl transition-all cursor-pointer shadow-md"
                  >
                    {cvGenerating ? "Generando Maqueta..." : "⚡ Renderizar Curriculum de Referencia"}
                  </button>
                </div>

                {/* Right side interactive live preview block container */}
                <div className="space-y-4 flex flex-col justify-between">
                  <div className="bg-gray-900/40 border border-gray-800 p-4 rounded-2xl flex-1 min-h-[300px]">
                    <span className="text-[10px] uppercase font-mono text-gray-500 block mb-3 tracking-widest">LIVE MAQUETA PREVIEW:</span>
                    
                    {cvHtml ? (
                      <div className="bg-white text-gray-900 rounded-xl overflow-hidden p-1 shadow-inner animate-fade-in text-left scale-[0.98] origin-top">
                        <div dangerouslySetInnerHTML={{ __html: cvHtml }} />
                      </div>
                    ) : (
                      <div className="text-center py-20 text-xs text-gray-500 font-mono border border-dashed border-gray-800 rounded-xl h-full flex items-center justify-center">
                        Presiona el botón de renderizar para ver el modelo de ejemplo optimizado.
                      </div>
                    )}
                  </div>

                  {cvHtml && (
                    <div className="flex gap-2 flex-wrap">
                      <button
                        onClick={handleDownloadCVPDF}
                        className="flex-1 min-w-[140px] bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                      >
                        📥 Descargar PDF de Referencia
                      </button>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(JSON.stringify(cvData, null, 2));
                          setCvCopied(true);
                          setTimeout(() => setCvCopied(false), 2000);
                        }}
                        className="bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 font-bold text-xs px-4 py-2.5 rounded-xl transition-all cursor-pointer"
                      >
                        {cvCopied ? "¡Copiado! ✓" : "Copiar Config"}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 8: COMMUNITY CHATROOM */}
          {tab === "chat" && (
            <div className="bg-[#0c1222] border border-[#1b253b] p-6 rounded-3xl shadow-xl flex flex-col h-[560px]">
              <div className="mb-4 shrink-0">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <MessageSquare className="text-amber-500" />
                  {lang === "ar" ? "ملتقى الطلاب المباشر والمجتمع" : "Forum d'Entraide Universitaire & Salons"}
                </h2>
                <p className="text-xs text-gray-400 mt-1">
                  {lang === "ar" ? "تبادل الخبرات مع زملائك حول مواعيد القنصلية، السكن، وتجارب الـ Homologación" : "Posez vos questions en espagnol ou français, l'IA corrigera instantanément vos erreurs."}
                </p>
              </div>

              {/* Chat lines area container */}
              <div className="flex-1 bg-[#070a13] border border-gray-800/80 rounded-2xl p-4 overflow-y-auto space-y-3.5 shadow-inner">
                {chats.map((c) => {
                  const isTeacher = c.user.includes("Profesor");
                  return (
                    <div 
                      key={c.id || Math.random().toString()} 
                      className={`flex flex-col max-w-[85%] animate-fade-in ${isTeacher ? 'bg-blue-600/10 border-2 border-blue-500/20 text-blue-100 p-3.5 rounded-2xl mx-auto w-full' : 'bg-[#0c1222] border border-gray-800/60 p-3 rounded-xl'}`}
                    >
                      <div className="flex items-center gap-2 text-[10px] font-mono font-bold tracking-tight">
                        <span className={isTeacher ? "text-blue-400 font-extrabold" : "text-amber-500"}>{c.user}</span>
                        <span className="text-gray-600 font-normal ml-auto">{c.time || "ahora"}</span>
                      </div>
                      <p className="text-xs mt-1.5 leading-relaxed text-gray-200 select-text whitespace-pre-line font-sans">
                        {c.text}
                      </p>
                    </div>
                  );
                })}
                <div ref={chatBottomRef} />
              </div>

              {/* Chat action message input bar layout container */}
              <div className="mt-4 pt-1 shrink-0 flex gap-2">
                <input 
                  type="text"
                  placeholder={
                    lang === "ar" ? "اكتب سؤالك أو مشاركتك هنا للجميع..." :
                    lang === "es" ? "Escribe un mensaje en la comunidad... (¡Suma +5 XP!)" :
                    "Tapez votre message ici..."
                  }
                  value={chatInp}
                  onChange={(e) => setChatInp(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && chatInp.trim()) handleSendChatRoom();
                  }}
                  className="bg-[#070a13] border border-gray-800 rounded-xl px-4 py-3 text-xs text-white outline-none focus:border-amber-500 flex-1 transition-colors font-sans"
                />
                <button
                  disabled={!chatInp.trim()}
                  onClick={handleSendChatChatroom}
                  className="bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-gray-950 font-extrabold text-xs px-5 rounded-xl cursor-pointer transition-colors font-sans"
                >
                  {lang === "ar" ? "إرسال" : "Enviar"}
                </button>
              </div>
            </div>
          )}

          {/* TAB 9: DESTINATION CITIES GUIDES */}
          {tab === "cities" && (
            <div className="bg-[#0c1222] border border-[#1b253b] p-6 rounded-3xl shadow-xl">
              <div className="mb-5 flex items-start justify-between flex-wrap gap-2">
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <Compass className="text-amber-500" />
                    {lang === "ar" ? "دليل المدن الإسبانية للطلاب" : "Guide de Survie & Logistique par Ville"}
                  </h2>
                  <p className="text-xs text-gray-400 mt-1">
                    {lang === "ar" ? "معلومات عملية مخصصة لكل مدينة حول الأنشطة، الاندماج ومؤشر أسعار السوبرماركت" : "Découvrez les secrets logistiques, les événements salsa et l'indice de prix des supermarchés."}
                  </p>
                </div>
              </div>

              <div className="flex gap-1.5 flex-wrap bg-[#070a13] p-1 border border-gray-800/80 rounded-2xl mb-6">
                {STUDENT_CITIES_GUIDE.map(cityObj => (
                  <button
                    key={cityObj.city}
                    onClick={() => setSelectedCityLife(cityObj.city)}
                    className={`px-4 py-2 text-xs font-semibold rounded-xl focus:outline-none transition-colors ${selectedCityLife === cityObj.city ? 'bg-amber-500 text-gray-900 font-bold' : 'text-gray-400 hover:text-white'}`}
                  >
                    {cityObj.flag} {cityObj.city}
                  </button>
                ))}
              </div>

              {(() => {
                const currentCityObj = STUDENT_CITIES_GUIDE.find(c => c.city === selectedCityLife) || STUDENT_CITIES_GUIDE[0];
                return (
                  <div className="space-y-6 animate-fade-in">
                    
                    <div className="p-5 bg-gradient-to-r from-amber-500/10 to-transparent border border-amber-500/20 rounded-2xl flex justify-between items-center flex-wrap gap-4">
                      <div>
                        <span className="text-[10px] uppercase font-mono bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded font-bold">
                          STUDENT PROFILE DOSSIER
                        </span>
                        <h3 className="text-xl font-black text-white mt-1.5">
                          {currentCityObj.city} {currentCityObj.flag}
                        </h3>
                        <p className="text-xs text-gray-400 mt-1 max-w-md font-sans">
                          Guía logística integral de integración comunitaria, redes estudiantiles y optimización de presupuesto de alimentación.
                        </p>
                      </div>

                      <button
                        onClick={() => handleDownloadCityPDF(currentCityObj)}
                        className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-black font-extrabold text-xs tracking-wider uppercase rounded-xl shadow transition-transform duration-150 transform active:scale-95 cursor-pointer"
                      >
                        📥 Guardar Guía en PDF Offline
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-sans">
                      <div className="bg-[#070a13] border border-gray-800 p-4 rounded-xl space-y-2">
                        <span className="text-[10px] text-amber-400 uppercase font-mono font-bold">1. Eventos Estudiantiles & Salsa:</span>
                        <p className="text-xs text-gray-300 leading-relaxed">
                          {currentCityObj.events[lang as keyof typeof currentCityObj.events] || currentCityObj.events.es}
                        </p>
                      </div>

                      <div className="bg-[#070a13] border border-gray-800 p-4 rounded-xl space-y-2">
                        <span className="text-[10px] text-emerald-400 uppercase font-mono font-bold">2. Integración & Hacer Amigos Locales:</span>
                        <p className="text-xs text-gray-300 leading-relaxed">
                          {currentCityObj.friends[lang as keyof typeof currentCityObj.friends] || currentCityObj.friends.es}
                        </p>
                      </div>

                      <div className="bg-[#070a13] border border-gray-800 p-4 rounded-xl space-y-2">
                        <span className="text-[10px] text-blue-400 uppercase font-mono font-bold">3. Supermercados Ahorro & Tips:</span>
                        <p className="text-xs text-gray-300 leading-relaxed">
                          <strong>Rankings:</strong> {currentCityObj.supermarkets.ranking[lang as keyof typeof currentCityObj.supermarkets.ranking] || currentCityObj.supermarkets.ranking.es}
                          <br /><br />
                          <strong>Pro-Tip:</strong> {currentCityObj.supermarkets.tips[lang as keyof typeof currentCityObj.supermarkets.tips] || currentCityObj.supermarkets.tips.es}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </main>
      </div>

      {/* DETAILED MODAL SHEET POPUP OVERLAY */}
      {selectedSpecialty && (
        <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#0c1222] border-2 border-[#1b253b] rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            
            <div className="flex justify-between items-start border-b border-gray-800 pb-3">
              <div>
                <span className="text-[10px] font-mono text-amber-400 uppercase tracking-widest block font-bold">Asignaturas oficiales y Módulos</span>
                <h3 className="text-lg font-bold text-white mt-1">{t(selectedSpecialty.name)}</h3>
              </div>
              <button 
                onClick={() => setSelectedSpecialty(null)}
                className="w-7 h-7 bg-gray-800 hover:bg-gray-700 rounded-full flex items-center justify-center text-xs text-white font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Specialty content compiler */}
            {(() => {
              const details = getSpecialtyDetails(selectedSpecialty.id || t(selectedSpecialty.name), lang);
              return (
                <div className="space-y-4 font-sans">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-[#070a13] p-3.5 border border-gray-800 rounded-xl space-y-1">
                      <span className="text-[10px] text-gray-500 font-mono block uppercase">MÓDULOS PRIMER AÑO:</span>
                      <p className="text-xs text-gray-200 leading-relaxed whitespace-pre-line">{details.year1}</p>
                    </div>
                    <div className="bg-[#070a13] p-3.5 border border-gray-800 rounded-xl space-y-1">
                      <span className="text-[10px] text-gray-500 font-mono block uppercase">MÓDULOS SEGUNDO AÑO:</span>
                      <p className="text-xs text-gray-200 leading-relaxed whitespace-pre-line">{details.year2}</p>
                    </div>
                  </div>

                  <div className="bg-amber-500/5 p-4 rounded-xl border border-amber-500/20 text-xs text-amber-300 leading-relaxed">
                    <strong>💼 Prácticas Obligatorias FCT:</strong> {details.fct}
                  </div>

                  <div className="p-4 bg-gray-900/60 border border-gray-800 rounded-xl text-xs space-y-1.5">
                    <span className="font-bold text-white block">🚀 {lang === "ar" ? "لماذا تختار هذا التخصص؟" : "¿Por qué elegir esta familia profesional?"}</span>
                    <p className="text-gray-400 leading-relaxed">{details.reason}</p>
                  </div>
                </div>
              );
            })()}

            <div className="pt-2 border-t border-gray-800 flex justify-end">
              <button
                onClick={() => setSelectedSpecialty(null)}
                className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-[#070a13] font-extrabold text-xs tracking-wider uppercase rounded-xl transition-all cursor-pointer"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONSOLIDATED REGULATORY FOOTER DISCLAIMER */}
      <footer className="bg-[#080d1a] border-t border-[#1b253b] text-center p-4 mt-8 shrink-0 text-xs text-gray-500 font-sans">
        <p className="max-w-2xl mx-auto leading-relaxed select-text">
          © 2026 Spain Study Student Portal (Atrévete a España). All rights reserved. 
          Todas las maquetas curriculares, itinerarios de extranjería e índices de precios mostrados son simulaciones de referencia educativa para guiar el expediente del alumno árabe.
        </p>
      </footer>
    </div>
  );
}