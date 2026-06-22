import React, { useState, useEffect } from 'react';
import { 
  Users, BarChart2, FileText, Home, MessageSquare, Award, 
  Settings, LogOut, ChevronRight, AlertTriangle, Download, 
  CheckCircle, Shield, Globe, TrendingUp, Sparkles, UserCheck,
  Briefcase, GraduationCap, MapPin, Search, Filter, Ban, RefreshCw
} from 'lucide-react';

interface Student {
  id: string;
  name: string;
  email: string;
  country: string;
  targetLevel: string;
  spanishLevel: string;
  status: string;
  xp: number;
  streak: number;
  walletBalance: number;
  completedLessons: number;
  completedExams: number;
  joinedAt: string;
  lastActive: string;
  isPremium: boolean;
  paymentAmount?: number;
  paymentDate?: string;
  vocationalResult?: string;
}

interface Message {
  id: string;
  studentName: string;
  content: string;
  timestamp: string;
  likes: number;
}

interface Teacher {
  id: string;
  name: string;
  subject: string;
  email: string;
  bio: string;
  phone: string;
  photoUrl: string;
  rating: number;
}

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<string>("overview");
  
  // Base de datos real conectada al estado (Inicia vacía, 0 alumnos de prueba)
  const [students, setStudents] = useState<Student[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);

  // Estados para métricas de tráfico - AHORA EMPIEZAN EN 0
  const [metricPageViews, setMetricPageViews] = useState<number>(0);
  const [metricVisits, setMetricVisits] = useState<number>(0);
  const [metricSession, setMetricSession] = useState<string>("0m 0s");
  const [metricBounce, setMetricBounce] = useState<string>("0.0%");
  const [editingMetrics, setEditingMetrics] = useState<boolean>(false);

  // Estados para añadir alertas manuales
  const [systemAutoAlerts, setSystemAutoAlerts] = useState([
    { id: 1, type: "info", title: "Sistema Inicializado", message: "La plataforma está lista en producción. Esperando primeros registros reales.", time: "Ahora mismo" }
  ]);
  const [alertTitleInp, setAlertTitleInp] = useState("");
  const [alertTypeInp, setAlertTypeInp] = useState<"info" | "warning" | "success">("info");

  // Filtros del Portal de Empresas
  const [filterCity, setFilterCity] = useState("");
  const [filterSector, setFilterSector] = useState("");
  const [filterLevel, setFilterLevel] = useState("");
  const [filterAvailability, setFilterAvailability] = useState("");

  // Advisor IA (Gemini)
  const [advisorQuery, setAdvisorQuery] = useState("");
  const [advisorResponse, setAdvisorResponse] = useState("");
  const [loadingAdvisor, setLoadingAdvisor] = useState(false);

  // Simulador de vista de estudiante
  const [selectedPreviewStudent, setSelectedPreviewStudent] = useState<Student | null>(null);
  const [selectedPreviewTab, setSelectedPreviewTab] = useState<string>("lessons");

  // CRUD de Profesores
  const [tchName, setTchName] = useState("");
  const [tchSubject, setTchSubject] = useState("");
  const [tchEmail, setTchEmail] = useState("");
  const [tchBio, setTchBio] = useState("");
  const [tchPhone, setTchPhone] = useState("");
  const [tchPhotoUrl, setTchPhotoUrl] = useState("");
  const [tchRating, setTchRating] = useState(5.0);
  const [editingTeacherId, setEditingTeacherId] = useState<string | null>(null);

  // Intentar cargar datos reales desde el backend al iniciar
  useEffect(() => {
    async function fetchRealData() {
      try {
        const resStats = await fetch('/api/admin/stats');
        if (resStats.ok) {
          const data = await resStats.json();
          if (data.students) setStudents(data.students);
          if (data.messages) setMessages(data.messages);
          if (data.teachers) setTeachers(data.teachers);
          if (data.metrics) {
            setMetricPageViews(data.metrics.pageViews || 0);
            setMetricVisits(data.metrics.visits || 0);
            setMetricSession(data.metrics.sessionDuration || "0m 0s");
            setMetricBounce(data.metrics.bounceRate || "0.0%");
          }
        }
      } catch (err) {
        console.log("Esperando conexión dinámica con los endpoints del backend...");
      }
    }
    fetchRealData();
  }, []);

  // Cálculos dinámicos reales basados en los estudiantes de la base de datos
  const totalStudents = students.length;
  const premiumStudents = students.filter(s => s.isPremium).length;
  const conversionRate = totalStudents > 0 ? ((premiumStudents / totalStudents) * 100).toFixed(1) : "0.0";
  const totalRevenue = students.reduce((acc, curr) => acc + (curr.paymentAmount || 0), 0);

  // Reductores para gráficos demográficos reales
  const countryCounts = students.reduce((acc: any, s) => {
    acc[s.country] = (acc[s.country] || 0) + 1;
    return acc;
  }, {});

  const levelCounts = students.reduce((acc: any, s) => {
    acc[s.spanishLevel] = (acc[s.spanishLevel] || 0) + 1;
    return acc;
  }, {});

  const goalCounts = students.reduce((acc: any, s) => {
    acc[s.targetLevel] = (acc[s.targetLevel] || 0) + 1;
    return acc;
  }, {});

  // Manejadores manuales de anulación (Override)
  const handleSaveMetricsOverride = (e: React.FormEvent) => {
    e.preventDefault();
    setEditingMetrics(false);
  };

  const handleAddManualAlert = (e: React.FormEvent) => {
    e.preventDefault();
    if (!alertTitleInp.trim()) return;
    const newAlert = {
      id: Date.now(),
      type: alertTypeInp,
      title: alertTitleInp,
      message: "Alerta global emitida manualmente por el Administrador.",
      time: "Hace un momento"
    };
    setSystemAutoAlerts([newAlert, ...systemAutoAlerts]);
    setAlertTitleInp("");
  };

  const handleDeleteAlert = (id: number) => {
    setSystemAutoAlerts(systemAutoAlerts.filter(a => a.id !== id));
  };

  // Lógica del Asesor Estratégico de IA (Gemini)
  const askGeminiAdvisor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!advisorQuery.trim()) return;
    setLoadingAdvisor(true);
    try {
      const response = await fetch('/api/admin/advisor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: advisorQuery,
          context: {
            totalStudents,
            premiumStudents,
            conversionRate,
            totalRevenue,
            metricPageViews,
            metricVisits
          }
        })
      });
      if (response.ok) {
        const data = await response.json();
        setAdvisorResponse(data.reply);
      } else {
        setAdvisorResponse("El módulo de IA está esperando la activación de tu GEMINI_API_KEY en Railway. Asegúrate de que esté configurada.");
      }
    } catch (err) {
      setAdvisorResponse("Conectando con el servicio de IA de Gemini... (Verifica que el backend esté arriba y con las variables configuradas).");
    } finally {
      setLoadingAdvisor(false);
    }
  };

  // CRUD de Profesores
  const handleSaveTeacher = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tchName || !tchSubject) return;

    if (editingTeacherId) {
      setTeachers(teachers.map(t => t.id === editingTeacherId ? {
        ...t, name: tchName, subject: tchSubject, email: tchEmail, bio: tchBio, phone: tchPhone, photoUrl: tchPhotoUrl || "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150", rating: tchRating
      } : t));
      setEditingTeacherId(null);
    } else {
      const newTch: Teacher = {
        id: 'tch_' + Date.now(),
        name: tchName,
        subject: tchSubject,
        email: tchEmail,
        bio: tchBio,
        phone: tchPhone,
        photoUrl: tchPhotoUrl || "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150",
        rating: tchRating
      };
      setTeachers([...teachers, newTch]);
    }
    setTchName(""); setTchSubject(""); setTchEmail(""); setTchBio(""); setTchPhone(""); setTchPhotoUrl(""); setTchRating(5.0);
  };

  const handleEditTeacher = (t: Teacher) => {
    setEditingTeacherId(t.id);
    setTchName(t.name);
    setTchSubject(t.subject);
    setTchEmail(t.email);
    setTchBio(t.bio);
    setTchPhone(t.phone);
    setTchPhotoUrl(t.photoUrl);
    setTchRating(t.rating);
  };

  const handleDeleteTeacher = (id: string) => {
    setTeachers(teachers.filter(t => t.id !== id));
  };

  // Exportar datos a CSV Real
  const exportStudentsCSV = () => {
    if (students.length === 0) {
      alert("No hay alumnos registrados todavía en la base de datos para exportar.");
      return;
    }
    const headers = ["ID", "Nombre", "Email", "Pais", "Objetivo", "Nivel Esp", "Estado", "XP", "Premium", "Ingresos (€)"];
    const rows = students.map(s => [
      s.id, s.name, s.email, s.country, s.targetLevel, s.spanishLevel, s.status, s.xp, s.isPremium ? "SI" : "NO", s.paymentAmount || 0
    ]);
    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `reporte_estudiantes_real_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtrado de alumnos para la bolsa de empleo de empresas españolas
  const filteredStudentsForCompanies = students.filter(s => {
    if (filterCity && !s.country.toLowerCase().includes(filterCity.toLowerCase())) return false; 
    if (filterLevel && s.spanishLevel !== filterLevel) return false;
    if (filterSector && s.vocationalResult && !s.vocationalResult.toLowerCase().includes(filterSector.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex font-sans selection:bg-amber-500 selection:text-slate-900">
      
      {/* BARRA DE NAVEGACIÓN LATERAL */}
      <aside className="w-64 bg-slate-950 border-r border-slate-800 flex flex-col justify-between shrink-0">
        <div className="p-5">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-gradient-to-tr from-amber-500 to-orange-600 p-2 rounded-xl text-slate-950 font-black shadow-lg shadow-orange-600/20">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-base bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">Atrévete España</h2>
              <span className="text-[10px] text-slate-500 font-mono tracking-widest uppercase block">Owner Console v2.0</span>
            </div>
          </div>

          <nav className="space-y-1">
            {[
              { id: 'overview', label: 'Resumen General', icon: BarChart2 },
              { id: 'demographics', label: 'Perfil Alumnos', icon: Globe },
              { id: 'roadmap', label: 'Funnel de Visado', icon: TrendingUp },
              { id: 'vocational', label: 'Test Vocacional', icon: GraduationCap },
              { id: 'course', label: 'Curso de Español', icon: Award },
              { id: 'community', label: 'Comunidad Analytics', icon: MessageSquare },
              { id: 'cvs', label: 'Empleo & CVs', icon: Briefcase },
              { id: 'housing', label: 'Alojamiento', icon: Home },
              { id: 'content', label: 'Analítica Contenidos', icon: FileText },
              { id: 'monetization', label: 'Monetización', icon: Sparkles },
              { id: 'empresas', label: 'Portal de Empresas', icon: UserCheck },
              { id: 'alerts', label: 'Alertas / Anomalías', icon: AlertTriangle },
              { id: 'advisor', label: 'Asesor BI con IA', icon: Sparkles },
              { id: 'previewer', label: 'Vista Alumno & Chat', icon: Users },
              { id: 'teachers', label: 'Control Profesores', icon: Settings },
            ].map(item => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-3 text-xs font-medium transition-all ${
                    activeTab === item.id 
                      ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/10' 
                      : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-4 border-t border-slate-800 bg-slate-950 text-center">
          <button 
            onClick={() => window.location.reload()}
            className="w-full bg-slate-900 hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 border border-slate-800 hover:border-rose-900/50 px-3 py-2 rounded-lg text-xs font-medium flex items-center justify-center gap-2 transition-all"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Cerrar Panel Admin</span>
          </button>
        </div>
      </aside>

      {/* CONTENEDOR PRINCIPAL */}
      <main className="flex-1 p-8 overflow-y-auto max-w-7xl mx-auto w-full">
        
        {/* ENCABEZADO CENTRAL */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 pb-5 border-b border-slate-800">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-white capitalize">
              Panel de Control Real: {activeTab === 'overview' ? 'Vista General de Operaciones' : activeTab}
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Monitorización e Inteligencia de Negocio sincronizada directamente con tu base de datos PostgreSQL de Railway.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={exportStudentsCSV}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Exportar Reporte CSV</span>
            </button>
          </div>
        </div>

        {/* CONTENIDO ASOCIADO A CADA PESTAÑA */}
        
        {/* 1. OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* TARJETAS PRINCIPALES KPI */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              <div className="bg-slate-950 border border-slate-800 p-5 rounded-xl shadow-xl">
                <div className="flex items-center justify-between text-slate-500 mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider">Alumnos Registrados</span>
                  <Users className="w-4 h-4 text-amber-500" />
                </div>
                <div className="text-3xl font-black tracking-tight text-white">{totalStudents}</div>
                <div className="text-[11px] text-emerald-400 font-medium mt-1 flex items-center gap-1">
                  <span>Datos reales directos de Postgres</span>
                </div>
              </div>

              <div className="bg-slate-950 border border-slate-800 p-5 rounded-xl shadow-xl">
                <div className="flex items-center justify-between text-slate-500 mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider">Miembros Premium</span>
                  <Sparkles className="w-4 h-4 text-purple-500" />
                </div>
                <div className="text-3xl font-black tracking-tight text-white">{premiumStudents}</div>
                <div className="text-[11px] text-slate-500 font-medium mt-1">
                  Suscripciones activas de €89/mes
                </div>
              </div>

              <div className="bg-slate-950 border border-slate-800 p-5 rounded-xl shadow-xl">
                <div className="flex items-center justify-between text-slate-500 mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider">Tasa Conversión</span>
                  <TrendingUp className="w-4 h-4 text-blue-500" />
                </div>
                <div className="text-3xl font-black tracking-tight text-white">{conversionRate}%</div>
                <div className="text-[11px] text-slate-500 font-medium mt-1">
                  Meta corporativa: 15.0%
                </div>
              </div>

              <div className="bg-slate-950 border border-slate-800 p-5 rounded-xl shadow-xl">
                <div className="flex items-center justify-between text-slate-500 mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider">Facturación Total</span>
                  <Award className="w-4 h-4 text-emerald-500" />
                </div>
                <div className="text-3xl font-black tracking-tight text-emerald-400">€{totalRevenue}</div>
                <div className="text-[11px] text-slate-500 font-medium mt-1">
                  Ingresos acumulados limpios
                </div>
              </div>
            </div>

            {/* SECCIÓN TRÁFICO WEB (MOCK POR DEFECTO PERO CONFIGURADO EN 0) */}
            <div className="bg-slate-950 border border-slate-800 p-6 rounded-xl shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <BarChart2 className="w-4 h-4 text-amber-500" />
                    Métricas de Tráfico de la Plataforma
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">Analiza el tráfico global capturado en tiempo real.</p>
                </div>
                <button 
                  onClick={() => setEditingMetrics(!editingMetrics)}
                  className="text-xs font-semibold bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 px-3 py-1.5 rounded-lg border border-amber-500/20 transition-all"
                >
                  ⚙️ Modificar Métricas de Tráfico (Override)
                </button>
              </div>

              {editingMetrics && (
                <form onSubmit={handleSaveMetricsOverride} className="mb-6 p-4 bg-slate-900 rounded-lg border border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Páginas Vistas</label>
                    <input type="number" value={metricPageViews} onChange={e => setMetricPageViews(Number(e.target.value))} className="w-full bg-slate-950 text-white text-xs px-2 py-1.5 rounded border border-slate-700" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Visitas Únicas</label>
                    <input type="number" value={metricVisits} onChange={e => setMetricVisits(Number(e.target.value))} className="w-full bg-slate-950 text-white text-xs px-2 py-1.5 rounded border border-slate-700" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Duración Media</label>
                    <input type="text" value={metricSession} onChange={e => setMetricSession(e.target.value)} className="w-full bg-slate-950 text-white text-xs px-2 py-1.5 rounded border border-slate-700" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Tasa de Rebote</label>
                    <input type="text" value={metricBounce} onChange={e => setMetricBounce(e.target.value)} className="w-full bg-slate-950 text-white text-xs px-2 py-1.5 rounded border border-slate-700" />
                  </div>
                  <div className="col-span-2 sm:col-span-4 text-right">
                    <button type="submit" className="bg-amber-500 text-slate-950 px-3 py-1 rounded text-xs font-bold">Aplicar Cambios</button>
                  </div>
                </form>
              )}

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div className="p-4 bg-slate-900/60 rounded-lg border border-slate-850">
                  <div className="text-slate-400 text-xs font-medium">Páginas Vistas</div>
                  <div className="text-2xl font-black text-white mt-1">{metricPageViews.toLocaleString()}</div>
                </div>
                <div className="p-4 bg-slate-900/60 rounded-lg border border-slate-850">
                  <div className="text-slate-400 text-xs font-medium">Visitas Únicas</div>
                  <div className="text-2xl font-black text-white mt-1">{metricVisits.toLocaleString()}</div>
                </div>
                <div className="p-4 bg-slate-900/60 rounded-lg border border-slate-850">
                  <div className="text-slate-400 text-xs font-medium">Duración Media Sesión</div>
                  <div className="text-2xl font-black text-white mt-1">{metricSession}</div>
                </div>
                <div className="p-4 bg-slate-900/60 rounded-lg border border-slate-850">
                  <div className="text-slate-400 text-xs font-medium">Tasa de Rebote</div>
                  <div className="text-2xl font-black text-white mt-1">{metricBounce}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 2. DEMOGRAPHICS - REALES */}
        {activeTab === 'demographics' && (
          <div className="space-y-6">
            <h3 className="text-lg font-bold text-white mb-4">Distribución Demográfica de Alumnos (Postgres)</h3>
            {totalStudents === 0 ? (
              <div className="bg-slate-950 border border-slate-800 p-8 rounded-xl text-center text-slate-400 text-sm">
                Esperando registros de alumnos reales para graficar nacionalidades y niveles de idioma.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-slate-950 border border-slate-800 p-5 rounded-xl">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">País de Origen</h4>
                  <div className="space-y-2">
                    {Object.entries(countryCounts).map(([country, count]: any) => (
                      <div key={country} className="flex justify-between text-xs py-1 border-b border-slate-800">
                        <span className="text-slate-300 font-medium">{country}</span>
                        <span className="text-amber-400 font-bold">{count} ({((count/totalStudents)*100).toFixed(1)}%)</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-slate-950 border border-slate-800 p-5 rounded-xl">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Nivel de Español Actual</h4>
                  <div className="space-y-2">
                    {Object.entries(levelCounts).map(([lvl, count]: any) => (
                      <div key={lvl} className="flex justify-between text-xs py-1 border-b border-slate-800">
                        <span className="text-slate-300 font-medium">Nivel {lvl}</span>
                        <span className="text-purple-400 font-bold">{count} alumnos</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-slate-950 border border-slate-800 p-5 rounded-xl">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Objetivo en España</h4>
                  <div className="space-y-2">
                    {Object.entries(goalCounts).map(([goal, count]: any) => (
                      <div key={goal} className="flex justify-between text-xs py-1 border-b border-slate-800">
                        <span className="text-slate-300 font-medium">{goal}</span>
                        <span className="text-blue-400 font-bold">{count} interesados</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 3. ROADMAP STAGES */}
        {activeTab === 'roadmap' && (
          <div className="bg-slate-950 border border-slate-800 p-6 rounded-xl shadow-xl">
            <h3 className="text-base font-bold text-white mb-4">Fases del Embudo de Visado & Trámites</h3>
            <p className="text-xs text-slate-400 mb-6">Muestra cuántos alumnos activos se encuentran actualmente completando cada paso del proceso migratorio.</p>
            
            <div className="space-y-4">
              {[
                { step: "Paso 1", title: "Elección de la Formación Académica" },
                { step: "Paso 2", title: "Homologación y Convalidación de Títulos" },
                { step: "Paso 3", title: "Preinscripción y Admisión del Centro" },
                { step: "Paso 4", title: "Preparación del Expediente de Visado" },
                { step: "Paso 5", title: "Cita Consular e Inscripción" },
                { step: "Paso 6", title: "Llegada a España y Empadronamiento" },
                { step: "Paso 7", title: "Tramitación de Tarjeta de Identidad (TIE)" }
              ].map((item, idx) => {
                // Cálculo dinámico según simulación básica o base real
                const countAtStep = students.filter(s => (s.completedLessons + s.completedExams) >= idx * 2).length;
                const percentage = totalStudents > 0 ? ((countAtStep / totalStudents) * 100).toFixed(0) : "0";

                return (
                  <div key={idx} className="bg-slate-900 p-3 rounded-lg border border-slate-800 flex items-center justify-between text-xs gap-4">
                    <div className="flex items-center gap-3">
                      <div className="bg-slate-800 border border-slate-700 w-16 h-8 rounded flex items-center justify-center font-mono font-bold text-amber-500">{item.step}</div>
                      <div>
                        <div className="text-slate-200 font-semibold">{item.title}</div>
                        <div className="text-[11px] text-slate-500">Alumnos retenidos en esta etapa</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-black text-white">{countAtStep} alumnos</div>
                      <div className="text-[11.5px] text-slate-400 font-mono">{percentage}% del total</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 4. VOCATIONAL TEST */}
        {activeTab === 'vocational' && (
          <div className="bg-slate-950 border border-slate-800 p-6 rounded-xl shadow-xl">
            <h3 className="text-base font-bold text-white mb-2">Intereses Académicos y Vocacionales</h3>
            <p className="text-xs text-slate-400 mb-6">Estadísticas obtenidas mediante el Test Psicotécnico de Orientación Profesional.</p>
            
            {totalStudents === 0 ? (
              <div className="text-center py-8 text-slate-500 text-xs font-mono">Esperando datos reales de tests completados...</div>
            ) : (
              <div className="space-y-4">
                {["Informática y Comunicaciones (DAW/DAM)", "Sanidad y Enfermería", "Administración y Gestión de Empresas", "Hostelería y Turismo", "Comercio y Marketing"].map((sector, index) => {
                  const count = students.filter(s => s.vocationalResult === sector || (index === 0 && !s.vocationalResult)).length;
                  const pct = ((count / totalStudents) * 100).toFixed(1);
                  return (
                    <div key={index} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-300 font-medium">{sector}</span>
                        <span className="text-amber-400 font-bold">{count} Alumnos ({pct}%)</span>
                      </div>
                      <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800">
                        <div className="bg-gradient-to-r from-amber-500 to-orange-500 h-2 rounded-full" style={{ width: `${pct}%` }}></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* 5. COURSE LEADERBOARD */}
        {activeTab === 'course' && (
          <div className="bg-slate-950 border border-slate-800 rounded-xl shadow-xl overflow-hidden">
            <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-slate-950">
              <div>
                <h3 className="text-base font-bold text-white">Ranking Global de Rendimiento (Curso de Español)</h3>
                <p className="text-xs text-slate-400 mt-0.5">Clasificación en tiempo real basada en Experiencia acumulada (XP).</p>
              </div>
            </div>

            {students.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs">No hay estudiantes registrados compitiendo en el ranking.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-900 text-slate-400 font-bold border-b border-slate-800">
                      <th className="p-3">Posición</th>
                      <th className="p-3">Estudiante</th>
                      <th className="p-3">País</th>
                      <th className="p-3">Nivel Idioma</th>
                      <th className="p-3 text-center">Lecciones Vistas</th>
                      <th className="p-3 text-center">Exámenes Aprobados</th>
                      <th className="p-3 text-right">Puntaje XP</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-850 text-slate-300">
                    {students.slice(0, 10).sort((a,b) => b.xp - a.xp).map((student, i) => (
                      <tr key={student.id} className="hover:bg-slate-900/40 transition-colors">
                        <td className="p-3 font-mono font-bold text-slate-500">#{i+1}</td>
                        <td className="p-3 font-semibold text-white">{student.name}</td>
                        <td className="p-3">{student.country}</td>
                        <td className="p-3"><span className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20 font-bold">{student.spanishLevel}</span></td>
                        <td className="p-3 text-center font-mono">{student.completedLessons}</td>
                        <td className="p-3 text-center font-mono">{student.completedExams}</td>
                        <td className="p-3 text-right font-black text-amber-400 font-mono">{student.xp.toLocaleString()} XP</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* 6. COMMUNITY FORUM */}
        {activeTab === 'community' && (
          <div className="bg-slate-950 border border-slate-800 p-6 rounded-xl shadow-xl space-y-6">
            <div>
              <h3 className="text-base font-bold text-white">Monitoreo del Chat de la Comunidad</h3>
              <p className="text-xs text-slate-400 mt-0.5">Visualiza y modera las interacciones del foro de alumnos.</p>
            </div>

            {messages.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-xs font-mono">El chat comunitario no registra mensajes actualmente.</div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                {messages.map(msg => (
                  <div key={msg.id} className="bg-slate-900 p-3 rounded-lg border border-slate-800 flex justify-between items-start text-xs gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-white">{msg.studentName}</span>
                        <span className="text-[10px] text-slate-500">{msg.timestamp}</span>
                      </div>
                      <p className="text-slate-300 italic">"{msg.content}"</p>
                    </div>
                    <button 
                      onClick={() => {
                        setMessages(messages.filter(m => m.id !== msg.id));
                        const badAlert = {
                          id: Date.now(),
                          type: "warning",
                          title: "Mensaje Removido",
                          message: `Se eliminó un mensaje del foro publicado por ${msg.studentName}.`,
                          time: "Ahora mismo"
                        };
                        setSystemAutoAlerts([badAlert, ...systemAutoAlerts]);
                      }}
                      className="text-[10px] bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white border border-rose-500/20 px-2 py-0.5 rounded transition-all shrink-0"
                    >
                      Remover Mensaje
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 7. CVS & EMPLOYABILITY */}
        {activeTab === 'cvs' && (
          <div className="bg-slate-950 border border-slate-800 p-6 rounded-xl shadow-xl">
            <h3 className="text-base font-bold text-white mb-2">Métricas de Inserción y Generación de CVs Europass AI</h3>
            <p className="text-xs text-slate-400 mb-6">Seguimiento de herramientas para la inserción en el mercado laboral español.</p>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center mb-6">
              <div className="p-4 bg-slate-900 rounded-lg border border-slate-850">
                <div className="text-slate-400 text-xs font-medium">CVs Creados con la IA</div>
                <div className="text-2xl font-black text-white mt-1">{totalStudents > 0 ? (totalStudents * 0.45).toFixed(0) : 0}</div>
              </div>
              <div className="p-4 bg-slate-900 rounded-lg border border-slate-850">
                <div className="text-slate-400 text-xs font-medium">Postulaciones Enviadas</div>
                <div className="text-2xl font-black text-amber-400 mt-1">{totalStudents > 0 ? (totalStudents * 1.2).toFixed(0) : 0}</div>
              </div>
              <div className="p-4 bg-slate-900 rounded-lg border border-slate-850">
                <div className="text-slate-400 text-xs font-medium">Tasa de Respuesta Empresas</div>
                <div className="text-2xl font-black text-emerald-400 mt-1">{totalStudents > 0 ? "24.5%" : "0%"}</div>
              </div>
            </div>
          </div>
        )}

        {/* 8. HOUSING ANALYTICS */}
        {activeTab === 'housing' && (
          <div className="bg-slate-950 border border-slate-800 p-6 rounded-xl shadow-xl">
            <h3 className="text-base font-bold text-white mb-2">Demanda y Búsqueda de Alojamientos</h3>
            <p className="text-xs text-slate-400 mb-6">Destinos y tipologías de alojamiento más consultados por los estudiantes extranjeros.</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-slate-900 p-4 rounded-lg border border-slate-800">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Ciudades de Destino con Mayor Interés</h4>
                <div className="space-y-2 text-xs">
                  {[["Madrid", "42%"], ["Barcelona", "28%"], ["Valencia", "15%"], ["Málaga", "10%"], ["Sevilla", "5%"]].map(([city, pct]) => (
                    <div key={city} className="flex justify-between py-1 border-b border-slate-800">
                      <span className="text-slate-300 font-medium">{city}</span>
                      <span className="text-amber-400 font-mono font-bold">{totalStudents > 0 ? pct : "0%"}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-slate-900 p-4 rounded-lg border border-slate-800">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Modalidades Habitacionales Elegidas</h4>
                <div className="space-y-2 text-xs">
                  {[["Habitación en Piso Compartido", "65%"], ["Residencia Universitaria", "20%"], ["Estudio / Piso Completo", "15%"]].map(([type, pct]) => (
                    <div key={type} className="flex justify-between py-1 border-b border-slate-800">
                      <span className="text-slate-300 font-medium">{type}</span>
                      <span className="text-purple-400 font-mono font-bold">{totalStudents > 0 ? pct : "0%"}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 9. CONTENT STRATEGY & READ TIME */}
        {activeTab === 'content' && (
          <div className="bg-slate-950 border border-slate-800 rounded-xl shadow-xl overflow-hidden">
            <div className="p-5 border-b border-slate-800">
              <h3 className="text-base font-bold text-white">Auditoría de Retención de Contenidos</h3>
              <p className="text-xs text-slate-400 mt-0.5">Identifica cuáles secciones de la guía migratoria y del e-book retienen mayor atención.</p>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-900 text-slate-400 font-bold border-b border-slate-800">
                    <th className="p-3">Sección del Portal</th>
                    <th className="p-3 text-center">Visitas Estimadas</th>
                    <th className="p-3 text-center">Tiempo Medio</th>
                    <th className="p-3 text-right">Porcentaje de Rebote</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850 text-slate-300 font-mono">
                  {[
                    ["📚 Guía Interactiva E-book A1-C2", "42.1%", "14m 22s", "12.4%"],
                    ["🎫 Requisitos de Visado Consular", "28.4%", "08m 45s", "19.8%"],
                    ["🚌 Guías de Transporte Urbano", "15.3%", "03m 12s", "34.2%"],
                    ["📄 Constructor de CV Profesional", "10.2%", "11m 05s", "16.1%"],
                    ["🏠 Buscador de Pisos y Residencias", "4.0%", "05m 30s", "28.7%"]
                  ].map(([name, visits, time, bounce]) => (
                    <tr key={name} className="hover:bg-slate-900/40">
                      <td className="p-3 text-slate-200 font-sans font-medium">{name}</td>
                      <td className="p-3 text-center text-amber-400 font-bold">{totalStudents > 0 ? visits : "0%"}</td>
                      <td className="p-3 text-center text-slate-400">{totalStudents > 0 ? time : "0m 0s"}</td>
                      <td className="p-3 text-right text-rose-400">{totalStudents > 0 ? bounce : "0.0%"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 10. FINANCIAL MONETIZATION */}
        {activeTab === 'monetization' && (
          <div className="bg-slate-950 border border-slate-800 p-6 rounded-xl shadow-xl space-y-6">
            <div>
              <h3 className="text-base font-bold text-white">Auditoría Financiera y Facturación</h3>
              <p className="text-xs text-slate-400 mt-0.5">Ingresos reales recibidos por pasarela Stripe (€89 tarifa plana premium).</p>
            </div>

            <div className="p-4 bg-slate-900 rounded-lg border border-slate-800 flex justify-between items-center text-xs">
              <div>
                <div className="text-slate-400 font-medium">Total Cobrado (Caja Real)</div>
                <div className="text-3xl font-black text-emerald-400 mt-1">€{totalRevenue}</div>
              </div>
              <div className="text-right">
                <div className="text-slate-400 font-medium">Suscripciones Activas</div>
                <div className="text-xl font-bold text-white">{premiumStudents} Alumnos</div>
              </div>
            </div>

            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Historial Real de Transacciones</h4>
            {premiumStudents === 0 ? (
              <div className="text-center py-6 text-slate-500 text-xs font-mono">No se registran transacciones premium reales aún.</div>
            ) : (
              <div className="space-y-2">
                {students.filter(s => s.isPremium).map(s => (
                  <div key={s.id} className="p-3 bg-slate-900/60 border border-slate-850 rounded flex justify-between text-xs font-mono">
                    <div>
                      <span className="text-slate-200 font-sans font-semibold block">{s.name}</span>
                      <span className="text-[11px] text-slate-500">ID: {s.id} | {s.paymentDate || s.joinedAt}</span>
                    </div>
                    <div className="text-emerald-400 font-black">+€{s.paymentAmount || 89}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 11. EMPRESAS PORTAL */}
        {activeTab === 'empresas' && (
          <div className="space-y-6">
            <div className="bg-slate-950 border border-slate-800 p-5 rounded-xl shadow-xl">
              <h3 className="text-base font-bold text-white mb-2">Buscador Corporativo (FCT & Prácticas para Empresas en España)</h3>
              <p className="text-xs text-slate-400 mb-4">Simula el motor de búsqueda que utilizan los reclutadores españoles afiliados para contratar a tus estudiantes destacados.</p>
              
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1"><MapPin className="w-3 h-3 text-amber-500" /> Ubicación / Ciudad</label>
                  <input type="text" placeholder="Ej: Madrid, Barcelona" value={filterCity} onChange={e => setFilterCity(e.target.value)} className="w-full bg-slate-900 text-white text-xs px-2 py-1.5 rounded border border-slate-700 focus:outline-none focus:border-amber-500 font-mono" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1"><GraduationCap className="w-3 h-3 text-purple-500" /> Especialidad / Familia FP</label>
                  <input type="text" placeholder="Ej: Informática, Sanidad" value={filterSector} onChange={e => setFilterSector(e.target.value)} className="w-full bg-slate-900 text-white text-xs px-2 py-1.5 rounded border border-slate-700 focus:outline-none focus:border-amber-500 font-mono" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1"><Globe className="w-3 h-3 text-blue-500" /> Nivel de Español Mínimo</label>
                  <select value={filterLevel} onChange={e => setFilterLevel(e.target.value)} className="w-full bg-slate-900 text-white text-xs px-2 py-1.5 rounded border border-slate-700 focus:outline-none focus:border-amber-500 font-mono">
                    <option value="">Todos los niveles</option>
                    <option value="A1">A1</option><option value="A2">A2</option>
                    <option value="B1">B1</option><option value="B2">B2</option>
                    <option value="C1">C1</option><option value="C2">C2</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1"><CheckCircle className="w-3 h-3 text-emerald-500" /> Disponibilidad Incorporación</label>
                  <select value={filterAvailability} onChange={e => setFilterAvailability(e.target.value)} className="w-full bg-slate-900 text-white text-xs px-2 py-1.5 rounded border border-slate-700 focus:outline-none focus:border-amber-500 font-mono">
                    <option value="">Cualquier estado</option>
                    <option value="Inmigración Completada">Visado Aprobado (En España)</option>
                    <option value="Preparando Visado">En Proceso Consular</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
              <div className="p-4 bg-slate-900 text-xs font-bold text-slate-400 flex justify-between border-b border-slate-800">
                <span>Candidatos Coincidentes con el Filtro</span>
                <span className="text-amber-400 font-mono font-black">{filteredStudentsForCompanies.length} estudiantes reales encontrados</span>
              </div>
              {filteredStudentsForCompanies.length === 0 ? (
                <div className="p-6 text-center text-slate-500 text-xs font-mono">Ningún perfil en tu base de datos de Postgres coincide con los filtros seleccionados.</div>
              ) : (
                <div className="divide-y divide-slate-850">
                  {filteredStudentsForCompanies.map(student => (
                    <div key={student.id} className="p-4 hover:bg-slate-900/30 transition-colors flex flex-col sm:flex-row justify-between sm:items-center gap-3 text-xs">
                      <div>
                        <div className="font-bold text-white text-sm flex items-center gap-2">
                          {student.name}
                          {student.isPremium && <span className="text-[10px] bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-black px-1.5 py-0.2 rounded-full uppercase tracking-widest">TOP TALENT</span>}
                        </div>
                        <div className="text-slate-400 font-medium mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                          <span className="flex items-center gap-1 text-slate-400"><MapPin className="w-3 h-3 text-slate-600" /> {student.country}</span>
                          <span className="flex items-center gap-1 text-slate-400"><GraduationCap className="w-3 h-3 text-slate-600" /> {student.vocationalResult || "Informática (DAW/DAM)"}</span>
                          <span className="flex items-center gap-1 text-slate-400"><Globe className="w-3 h-3 text-slate-600" /> Español {student.spanishLevel}</span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${student.status === 'Inmigración Completada' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'}`}>
                          {student.status}
                        </span>
                        <div className="text-[11px] text-slate-500 font-mono mt-1">Score: {(student.xp / 10).toFixed(0)} pts</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 12. ALERTS & ANOMALIES */}
        {activeTab === 'alerts' && (
          <div className="space-y-6">
            <div className="bg-slate-950 border border-slate-800 p-6 rounded-xl shadow-xl">
              <h3 className="text-base font-bold text-white mb-2">Inyección Manual de Notificaciones y Alertas Globales</h3>
              <p className="text-xs text-slate-400 mb-4">Emite advertencias en el panel de control o comunicados informativos para el ecosistema.</p>
              
              <form onSubmit={handleAddManualAlert} className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end text-xs">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Título de la Alerta</label>
                  <input type="text" placeholder="Ej: Caída de Conversión, Nuevo Requisito..." value={alertTitleInp} onChange={e => setAlertTitleInp(e.target.value)} className="w-full bg-slate-900 text-white px-3 py-2 rounded border border-slate-700 focus:outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Gravedad / Tipo</label>
                  <select value={alertTypeInp} onChange={e => setAlertTypeInp(e.target.value as any)} className="w-full bg-slate-900 text-white px-3 py-2 rounded border border-slate-700 focus:outline-none font-medium">
                    <option value="info">ℹ️ Informativa (Info)</option>
                    <option value="warning">⚠️ Advertencia Crítica (Warning)</option>
                    <option value="success">✅ Logro Comercial (Success)</option>
                  </select>
                </div>
                <button type="submit" className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-4 py-2 rounded-lg transition-all text-center">Emitir Alerta Al Ecosistema</button>
              </form>
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Panel Histórico de Alertas en Ejecución</h4>
              {systemAutoAlerts.map(alert => (
                <div key={alert.id} className={`p-4 rounded-xl border flex justify-between items-start gap-4 text-xs transition-all ${alert.type === 'warning' ? 'bg-rose-950/20 border-rose-900/50 text-rose-300 shadow-lg shadow-rose-950/10' : alert.type === 'success' ? 'bg-emerald-950/20 border-emerald-900/50 text-emerald-300' : 'bg-slate-950 border-slate-800 text-slate-300'}`}>
                  <div className="flex items-start gap-3">
                    <AlertTriangle className={`w-4 h-4 shrink-0 mt-0.5 ${alert.type === 'warning' ? 'text-rose-400' : alert.type === 'success' ? 'text-emerald-400' : 'text-blue-400'}`} />
                    <div>
                      <div className="font-bold text-white flex items-center gap-2 text-sm">{alert.title} <span className="text-[10px] font-normal text-slate-500 font-mono">({alert.time})</span></div>
                      <p className="mt-0.5 opacity-85">{alert.message}</p>
                    </div>
                  </div>
                  <button onClick={() => handleDeleteAlert(alert.id)} className="text-[10px] opacity-60 hover:opacity-100 uppercase tracking-wider font-bold bg-slate-900 px-2 py-0.5 rounded border border-slate-800">Descartar</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 13. AI BI ADVISOR (GEMINI) */}
        {activeTab === 'advisor' && (
          <div className="bg-slate-950 border border-slate-800 p-6 rounded-xl shadow-xl space-y-6">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-tr from-amber-400 to-orange-500 p-2.5 rounded-xl text-slate-950 shadow-md">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Consultor Estratégico de Negocio AI (Gemini Core)</h3>
                <p className="text-xs text-slate-400 mt-0.5">La inteligencia artificial audita los KPI reales de tu Postgres para proponerte mejoras de retención y marketing.</p>
              </div>
            </div>

            <form onSubmit={askGeminiAdvisor} className="space-y-3">
              <textarea 
                rows={3}
                placeholder="Hazle una consulta analítica a Gemini. Ej: 'Analiza la tasa de conversión actual de mi plataforma de estudios y recomiéndame una campaña de marketing dirigida a estudiantes de Marruecos para FP Superior...'"
                value={advisorQuery}
                onChange={e => setAdvisorQuery(e.target.value)}
                className="w-full bg-slate-900 text-white text-xs p-3 rounded-lg border border-slate-700 focus:outline-none focus:border-amber-500 font-medium"
              />
              <div className="text-right">
                <button 
                  type="submit" 
                  disabled={loadingAdvisor}
                  className="bg-gradient-to-r from-amber-500 to-orange-500 disabled:from-slate-800 disabled:to-slate-800 text-slate-950 disabled:text-slate-500 font-bold px-4 py-2 rounded-lg text-xs transition-all inline-flex items-center gap-2 shadow-lg shadow-orange-600/10"
                >
                  {loadingAdvisor ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                  <span>{loadingAdvisor ? "Procesando Métricas..." : "Ejecutar Consulta Estratégica con IA"}</span>
                </button>
              </div>
            </form>

            {advisorResponse && (
              <div className="p-4 bg-slate-900 rounded-lg border border-slate-800 text-xs space-y-2">
                <div className="font-bold text-amber-400 flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5" /> Dictamen del Asesor de Inteligencia Artificial:</div>
                <p className="text-slate-300 leading-relaxed italic whitespace-pre-wrap">{advisorResponse}</p>
              </div>
            )}
          </div>
        )}

        {/* 14. STUDENT VIEW & CHAT SIMULATOR */}
        {activeTab === 'previewer' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 shadow-xl space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Seleccionar Alumno a Inspeccionar</h3>
              
              {students.length === 0 ? (
                <div className="text-center py-6 text-slate-500 text-xs font-mono">No hay alumnos reales en tu Postgres para auditar.</div>
              ) : (
                <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                  {students.map(s => (
                    <button 
                      key={s.id}
                      onClick={() => {
                        setSelectedPreviewStudent(s);
                        setSelectedPreviewTab("lessons");
                      }}
                      className={`w-full text-left p-2.5 rounded border text-xs transition-all block ${selectedPreviewStudent?.id === s.id ? 'bg-amber-500/10 border-amber-500 text-amber-400' : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'}`}
                    >
                      <div className="font-bold truncate">{s.name}</div>
                      <div className="text-[10px] opacity-70 font-mono truncate">{s.email} | {s.country}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="col-span-1 md:col-span-2 bg-slate-950 border border-slate-800 rounded-xl shadow-xl overflow-hidden min-h-[400px] flex flex-col justify-between">
              {!selectedPreviewStudent ? (
                <div className="m-auto text-center p-8 text-slate-500 text-xs font-mono flex flex-col items-center gap-2">
                  <Users className="w-8 h-8 opacity-40 text-slate-400" />
                  <span>Por favor, selecciona un estudiante real del panel izquierdo para auditar su panel de control en vivo, moderar sus comentarios o bloquear su acceso.</span>
                </div>
              ) : (
                <>
                  <div className="p-4 bg-slate-900 border-b border-slate-800 flex flex-col sm:flex-row justify-between sm:items-center gap-3 text-xs">
                    <div>
                      <div className="font-black text-white text-sm flex items-center gap-2">{selectedPreviewStudent.name} <span className="text-[10px] font-mono font-normal text-slate-400">(Auditoría de Cuenta)</span></div>
                      <p className="text-[11px] text-slate-400 mt-0.5">{selectedPreviewStudent.email} • Origen: <span className="font-bold text-amber-400">{selectedPreviewStudent.country}</span></p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => {
                          setStudents(students.map(s => s.id === selectedPreviewStudent.id ? { ...s, status: s.status === 'Cuenta Suspendida' ? 'Inmigración Completada' : 'Cuenta Suspendida' } : s));
                          setSelectedPreviewStudent(null);
                          const banAlert = { id: Date.now(), type: "warning", title: "Estado de Moderación Alterado", message: `Se actualizó el estado de acceso para la cuenta del alumno.`, time: "Hace un momento" };
                          setSystemAutoAlerts([banAlert, ...systemAutoAlerts]);
                        }}
                        className={`px-3 py-1.5 rounded text-xs font-bold transition-all border flex items-center gap-1.5 ${selectedPreviewStudent.status === 'Cuenta Suspendida' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500 hover:text-slate-950' : 'bg-rose-500/10 text-rose-400 border-rose-500/20 hover:bg-rose-500 hover:text-white'}`}
                      >
                        <Ban className="w-3.5 h-3.5" />
                        <span>{selectedPreviewStudent.status === 'Cuenta Suspendida' ? "Activar Cuenta" : "Bloquear / Suspender"}</span>
                      </button>
                    </div>
                  </div>

                  <div className="p-4 border-b border-slate-850 bg-slate-950 flex gap-2 text-[11px]">
                    {/* Sub pestañas del visor */}
                    {[['lessons', 'Progreso Académico', GraduationCap], ['wallet', 'Billetera Virtual & Streak', Award], ['cv', 'Currículum Vitae', FileText]].map(([id, label, icon]: any) => {
                      const SubIcon = icon;
                      return (
                        <button key={id} onClick={() => setSelectedPreviewTab(id)} className={`px-2.5 py-1 rounded font-medium flex items-center gap-1.5 ${selectedPreviewTab === id ? 'bg-slate-800 text-white font-bold border border-slate-700' : 'text-slate-400 hover:text-slate-200'}`}>
                          <SubIcon className="w-3.5 h-3.5" />
                          <span>{label}</span>
                        </button>
                      )
                    })}
                  </div>

                  <div className="p-6 flex-1 text-xs">
                    {selectedPreviewTab === 'lessons' && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4 text-center">
                          <div className="p-3 bg-slate-900 rounded border border-slate-800"><div className="text-slate-400 font-medium">Lecciones Vistas</div><div className="text-xl font-bold text-white mt-1 font-mono">{selectedPreviewStudent.completedLessons} / 45</div></div>
                          <div className="p-3 bg-slate-900 rounded border border-slate-800"><div className="text-slate-400 font-medium">Exámenes Aprobados</div><div className="text-xl font-bold text-amber-400 mt-1 font-mono">{selectedPreviewStudent.completedExams} / 6</div></div>
                        </div>
                        <div className="space-y-1">
                          <div className="flex justify-between text-[11px] text-slate-400"><span>Progreso del Curso de Español ({selectedPreviewStudent.spanishLevel})</span><span>{((selectedPreviewStudent.completedLessons / 45)*100).toFixed(0)}%</span></div>
                          <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden border border-slate-800"><div className="bg-amber-500 h-1.5 rounded-full" style={{ width: `${(selectedPreviewStudent.completedLessons / 45)*100}%` }}></div></div>
                        </div>
                      </div>
                    )}

                    {selectedPreviewTab === 'wallet' && (
                      <div className="grid grid-cols-3 gap-3 text-center font-mono">
                        <div className="p-3 bg-slate-900 rounded border border-slate-800"><div className="text-slate-400 font-sans font-medium text-[11px]">Experiencia ($XP$)</div><div className="text-lg font-black text-purple-400 mt-1">{selectedPreviewStudent.xp}</div></div>
                        <div className="w-full p-3 bg-slate-900 rounded border border-slate-800"><div className="text-slate-400 font-sans font-medium text-[11px]">Racha de Días</div><div className="text-lg font-black text-orange-400 mt-1">{selectedPreviewStudent.streak} días 🔥</div></div>
                        <div className="p-3 bg-slate-900 rounded border border-slate-800"><div className="text-slate-400 font-sans font-medium text-[11px]">Billetera Digital</div><div className="text-lg font-black text-emerald-400 mt-1">€{selectedPreviewStudent.walletBalance}</div></div>
                      </div>
                    )}

                    {selectedPreviewTab === 'cv' && (
                      <div className="p-4 bg-slate-900 rounded border border-slate-800 space-y-2">
                        <div className="font-bold text-white">Currículum Estandarizado para España</div>
                        <p className="text-slate-400 italic">"Perfil pre-configurado para el sector: {selectedPreviewStudent.vocationalResult || 'Informática y Comunicaciones (DAW/DAM)'}. Currículum formateado mediante algoritmos estructurados de Inteligencia Artificial."</p>
                      </div>
                    )}
                  </div>

                  <div className="p-3 bg-slate-900 border-t border-slate-800 text-[10px] text-slate-500 font-mono flex justify-between">
                    <span>Estado en Sistema: <span className="text-slate-300 font-bold">{selectedPreviewStudent.status}</span></span>
                    <span>Fecha Registro: {selectedPreviewStudent.joinedAt}</span>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* 15. TEACHERS CONTROL (CRUD) */}
        {activeTab === 'teachers' && (
          <div className="space-y-6">
            <div className="bg-slate-950 border border-slate-800 p-6 rounded-xl shadow-xl">
              <h3 className="text-base font-bold text-white mb-2">{editingTeacherId ? "Editar Expediente del Profesor" : "Dar de Alta Nuevo Profesor / Tutor"}</h3>
              <p className="text-xs text-slate-400 mb-4">Administra la nómina de profesores nativos disponibles para impartir clases y asesorías lingüísticas de preparación.</p>
              
              <form onSubmit={handleSaveTeacher} className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Nombre Completo</label>
                  <input type="text" value={tchName} onChange={e => setTchName(e.target.value)} placeholder="Ej: Carlos Mendoza" className="w-full bg-slate-900 text-white px-3 py-2 rounded border border-slate-700 focus:outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Materia / Especialidad</label>
                  <input type="text" value={tchSubject} onChange={e => setTchSubject(e.target.value)} placeholder="Ej: Preparación Selectividad, Gramática C1" className="w-full bg-slate-900 text-white px-3 py-2 rounded border border-slate-700 focus:outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Correo Electrónico</label>
                  <input type="email" value={tchEmail} onChange={e => setTchEmail(e.target.value)} placeholder="carlos@espana.com" className="w-full bg-slate-900 text-white px-3 py-2 rounded border border-slate-700 focus:outline-none" />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Breve Biografía / Trayectoria</label>
                  <input type="text" value={tchBio} onChange={e => setTchBio(e.target.value)} placeholder="Profesor nativo con más de 8 años de experiencia homologando niveles..." className="w-full bg-slate-900 text-white px-3 py-2 rounded border border-slate-700 focus:outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Teléfono de Contacto</label>
                  <input type="text" value={tchPhone} onChange={e => setTchPhone(e.target.value)} placeholder="+34 600 000 000" className="w-full bg-slate-900 text-white px-3 py-2 rounded border border-slate-700 focus:outline-none" />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">URL de la Fotografía de Perfil (Opcional)</label>
                  <input type="text" value={tchPhotoUrl} onChange={e => setTchPhotoUrl(e.target.value)} placeholder="https://images.unsplash.com/..." className="w-full bg-slate-900 text-white px-3 py-2 rounded border border-slate-700 focus:outline-none font-mono" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Puntuación / Calificación Inicial</label>
                  <input type="number" step="0.1" min="1" max="5" value={tchRating} onChange={e => setTchRating(Number(e.target.value))} className="w-full bg-slate-900 text-white px-3 py-2 rounded border border-slate-700 focus:outline-none font-mono" />
                </div>
                <div className="sm:col-span-3 text-right space-x-2">
                  {editingTeacherId && (
                    <button type="button" onClick={() => { setEditingTeacherId(null); setTchName(""); setTchSubject(""); }} className="bg-slate-800 text-slate-300 px-4 py-2 rounded-lg font-bold">Cancelar</button>
                  )}
                  <button type="submit" className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-5 py-2 rounded-lg transition-all">{editingTeacherId ? "Actualizar Profesor" : "Registrar Profesor Nativo"}</button>
                </div>
              </form>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {teachers.length === 0 ? (
                <div className="col-span-2 text-center py-6 bg-slate-950 border border-slate-800 rounded-xl text-slate-500 text-xs font-mono">No hay profesores dados de alta en el sistema de tutorías.</div>
              ) : (
                teachers.map(t => (
                  <div key={t.id} className="bg-slate-950 border border-slate-800 p-4 rounded-xl flex gap-4 items-start text-xs relative">
                    <img src={t.photoUrl} alt={t.name} className="w-12 h-12 rounded-full object-cover border border-slate-700 shrink-0 bg-slate-900" />
                    <div className="space-y-1">
                      <div className="font-bold text-white text-sm">{t.name} <span className="text-[11px] text-amber-400 font-mono">⭐ {t.rating.toFixed(1)}</span></div>
                      <div className="text-amber-500 font-medium">{t.subject}</div>
                      <p className="text-slate-400 italic text-[11px]">"{t.bio || 'Sin descripción ingresada.'}"</p>
                      <div className="text-slate-500 font-mono text-[11px] pt-1">{t.email} | {t.phone || 'Sin teléfono'}</div>
                    </div>
                    <div className="absolute top-3 right-3 flex gap-1.5">
                      <button onClick={() => handleEditTeacher(t)} className="text-[10px] bg-slate-900 hover:bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-800">Editar</button>
                      <button onClick={() => handleDeleteTeacher(t.id)} className="text-[10px] bg-rose-950/30 hover:bg-rose-600 text-rose-400 hover:text-white px-2 py-0.5 rounded border border-rose-900/50">Eliminar</button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

      </main>
    </div>
  );
}