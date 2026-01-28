"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { formatCurrency } from "@/lib/utils";
import { colombiaData, departments } from "@/lib/colombia-data";
import * as XLSX from "xlsx";

interface Client {
  id: string;
  created_at: string;
  full_name: string | null;
  company_name: string | null;
  email: string | null;
  phone: string | null;
  status: string;
  client_type: "Natural" | "Empresa";
  document_type: string | null;
  document_number: string | null;
  document_info: string | null; // NIT for Empresa
  nit: string | null;
  contact_person: string | null;
  position: string | null;
  whatsapp: string | null;
  department: string | null;
  municipality: string | null;
  address: string | null;
  notes: string | null; // Used for "Requerimientos"
  photo_url: string | null;
  // CRM fields
  tags: string[] | null;
  industry: string | null;
  industry_sector: string | null;
  last_contact_at: string | null;
  source: string | null;
  source_type: string | null;
  source_sub_type: string | null;
  referred_by_brand_id: number | null;
  assigned_to_name: string | null;
}

interface Brand {
  id: number;
  name: string;
}

interface Interaction {
  id: number;
  client_id: string;
  type: "Nota" | "Llamada" | "Reunión" | "Correo" | "Soporte";
  content: string;
  created_at: string;
  created_by: string | null;
}

interface Task {
  id: string;
  codigo: number;
  created_at: string;
  title: string;
  description: string | null;
  due_date: string;
  status: "Pendiente" | "Completada" | "Cancelada";
  assigned_to: string | null;
  client_id: string | null;
  created_by: string | null;
  client?: {
    full_name: string | null;
    company_name: string | null;
  };
}

const CLIENT_SECTORS = [
  'Turìsmo', 'Agricultura', 'Comercial', 'Educaciòn', 'Salud', 'Industrial', 
  'Seguridad-Vigilancia', 'Hoteleria', 'Restaurante', 'Construcciòn', 
  'Conjunto Residenciales', 'Servicios', 'Transporte', 'Gobierno', 
  'Petroleras', 'Minerìa', 'Manufactura'
];

const AdminClientsPage = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 6;
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingClientId, setEditingClientId] = useState<string | null>(null);
  const router = useRouter();

  // Metrics State
  const [metrics, setMetrics] = useState({
    total: 0,
    activeMonth: 0,
    new30d: 0,
    pendingTasks: 0,
  });

  const [brands, setBrands] = useState<Brand[]>([]);

  // Client Detail Tabs & Orders
  const [activeTab, setActiveTab] = useState<"General" | "Historial" | "CRM">(
    "General",
  );
  const [clientOrders, setClientOrders] = useState<any[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  // CRM State
  const [clientInteractions, setClientInteractions] = useState<Interaction[]>(
    [],
  );
  const [loadingInteractions, setLoadingInteractions] = useState(false);
  const [isAddingInteraction, setIsAddingInteraction] = useState(false);
  const [newInteraction, setNewInteraction] = useState({
    type: "Nota" as Interaction["type"],
    content: "",
  });
  const [newTag, setNewTag] = useState("");
  const [isSavingTags, setIsSavingTags] = useState(false);

  // Dashboward Tabs
  const [viewTab, setViewTab] = useState<"Clientes" | "Tareas">("Clientes");

  // CRM Tasks State
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isEditingTask, setIsEditingTask] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  
  // Task Filters
  const [taskSearchTerm, setTaskSearchTerm] = useState("");
  const [taskStatusFilter, setTaskStatusFilter] = useState("all");
  const [taskAdvisorFilter, setTaskAdvisorFilter] = useState("all");
  const [taskDateFilter, setTaskDateFilter] = useState("all");
  const [taskDueSoonFilter, setTaskDueSoonFilter] = useState(false);
  const [isTaskFilterDropdownOpen, setIsTaskFilterDropdownOpen] = useState(false);
  const taskDropdownRef = useRef<HTMLDivElement>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  const [taskFormData, setTaskFormData] = useState({
    title: "",
    description: "",
    due_date: new Date().toISOString().split("T")[0],
    assigned_to: "",
    client_id: "",
    status: "Pendiente" as Task["status"],
  });

  // Google Calendar / Follow-up State
  const [showFollowupForm, setShowFollowupForm] = useState(false);
  const [followupData, setFollowupData] = useState({
    title: "",
    date: new Date().toISOString().split("T")[0],
    time: "10:00",
    type: "Llamada" as Interaction["type"],
    description: "",
  });

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [tagFilter, setTagFilter] = useState("all");
  const [showOnlyNew, setShowOnlyNew] = useState(false);
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Report State
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportStartDate, setReportStartDate] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      .toISOString()
      .split("T")[0],
  );
  const [reportEndDate, setReportEndDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsFilterDropdownOpen(false);
      }
      if (
        taskDropdownRef.current &&
        !taskDropdownRef.current.contains(event.target as Node)
      ) {
        setIsTaskFilterDropdownOpen(false);
      }
    }
    if (isFilterDropdownOpen || isTaskFilterDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isFilterDropdownOpen, isTaskFilterDropdownOpen]);

  // Form State
  const [clientType, setClientType] = useState<"Natural" | "Empresa">(
    "Natural",
  );
  const [formData, setFormData] = useState({
    full_name: "",
    company_name: "",
    document_type: "C.C",
    document_number: "",
    document_info: "", // Applied as NIT for Empresa
    nit: "",
    contact_person: "",
    position: "",
    whatsapp: "",
    phone: "",
    email: "",
    department: "",
    municipality: "",
    address: "",
    notes: "",
    industry: "",
    industry_sector: "",
    source: "Nuevo",
    source_type: "Nuevo",
    source_sub_type: "",
    referred_by_brand_id: 0,
    assigned_to_name: "",
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const selectedClient = clients.find((c) => c.id === selectedClientId) || null;
  const selectedTask = tasks.find((t) => t.id === selectedTaskId) || null;

  useEffect(() => {
    fetchClients();
    fetchBrands();
    fetchTasks();
  }, []);

  const fetchBrands = async () => {
    const { data } = await supabase
      .from("brands")
      .select("id, name")
      .order("name");
    if (data) setBrands(data);
  };

  const fetchTasks = async () => {
    setLoadingTasks(true);
    const { data, error } = await supabase
      .from("client_tasks")
      .select("*, client:clients(full_name, company_name)")
      .order("due_date", { ascending: true });

    if (error) {
      console.error("Error fetching tasks:", error);
    } else if (data) {
      setTasks(data);
      // Update pending tasks metric
      const pendingCount = data.filter(t => t.status === 'Pendiente').length;
      setMetrics(prev => ({ ...prev, pendingTasks: pendingCount }));
    }
    setLoadingTasks(false);
  };

  const handleCreateTask = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSubmitting(true);

    try {
      const taskData = {
        title: taskFormData.title,
        description: taskFormData.description,
        due_date: new Date(taskFormData.due_date).toISOString(),
        assigned_to: taskFormData.assigned_to,
        client_id: taskFormData.client_id || null,
        status: taskFormData.status,
      };

      if (isEditingTask && editingTaskId) {
        const { error } = await supabase
          .from("client_tasks")
          .update(taskData)
          .eq("id", editingTaskId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("client_tasks")
          .insert([taskData]);
        if (error) throw error;
      }

      setIsTaskModalOpen(false);
      setIsEditingTask(false);
      setEditingTaskId(null);
      setTaskFormData({
        title: "",
        description: "",
        due_date: new Date().toISOString().split("T")[0],
        assigned_to: "",
        client_id: "",
        status: "Pendiente",
      });
      fetchTasks();
    } catch (error: any) {
      alert(`Error al guardar tarea: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateTaskStatus = async (taskId: string, newStatus: Task["status"]) => {
    try {
      const { error } = await supabase
        .from("client_tasks")
        .update({ status: newStatus })
        .eq("id", taskId);
      
      if (error) throw error;
      
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
      
      // Update metric locally
      if (newStatus === 'Completada' || newStatus === 'Cancelada') {
        setMetrics(prev => ({ ...prev, pendingTasks: Math.max(0, prev.pendingTasks - 1) }));
      } else if (newStatus === 'Pendiente') {
        setMetrics(prev => ({ ...prev, pendingTasks: prev.pendingTasks + 1 }));
      }
    } catch (error: any) {
      alert(`Error al actualizar estado: ${error.message}`);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm("¿Estás seguro de eliminar esta tarea?")) return;

    try {
      const task = tasks.find(t => t.id === taskId);
      const { error } = await supabase
        .from("client_tasks")
        .delete()
        .eq("id", taskId);
      
      if (error) throw error;
      
      setTasks(prev => prev.filter(t => t.id !== taskId));
      if (task?.status === 'Pendiente') {
        setMetrics(prev => ({ ...prev, pendingTasks: Math.max(0, prev.pendingTasks - 1) }));
      }
    } catch (error: any) {
      alert(`Error al eliminar tarea: ${error.message}`);
    }
  };

  const fetchClients = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("clients")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching clients:", error);
    } else if (data) {
      setClients(data);
      calculateMetrics(data);

      // DATA CORRECTION: Fix clients that should be active but are marked as inactive
      const inactiveWithOrders = async () => {
        const { data: ordersWithClients } = await supabase
          .from("orders")
          .select("client_id");

        if (ordersWithClients) {
          const clientIdsWithOrders = new Set(
            ordersWithClients.map((o) => o.client_id),
          );
          const clientsToUpdate = data.filter(
            (c) => c.status === "Inactivo" && clientIdsWithOrders.has(c.id),
          );

          if (clientsToUpdate.length > 0) {
            console.log(
              `Fixing status for ${clientsToUpdate.length} clients...`,
            );
            await Promise.all(
              clientsToUpdate.map((c) =>
                supabase
                  .from("clients")
                  .update({ status: "Activo" })
                  .eq("id", c.id),
              ),
            );
            // Re-fetch to show updated status
            const { data: updatedData } = await supabase
              .from("clients")
              .select("*")
              .order("created_at", { ascending: false });
            if (updatedData) setClients(updatedData);
          }
        }
      };
      inactiveWithOrders();
    }
    setLoading(false);
  };

  const fetchClientOrders = async (clientId: string) => {
    setLoadingOrders(true);
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .eq("client_id", clientId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching client orders:", error);
    } else {
      setClientOrders(data || []);
    }
    setLoadingOrders(false);
  };

  const fetchInteractions = async (clientId: string) => {
    setLoadingInteractions(true);
    const { data, error } = await supabase
      .from("client_interactions")
      .select("*")
      .eq("client_id", clientId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching interactions:", error);
    } else {
      setClientInteractions(data || []);
    }
    setLoadingInteractions(false);
  };

  const handleAddInteraction = async (
    e: React.FormEvent,
    override?: { type: Interaction["type"]; content: string },
  ) => {
    e?.preventDefault();
    const type = override?.type || newInteraction.type;
    const content = override?.content || newInteraction.content;

    if (!selectedClientId || !content.trim()) return;

    setIsAddingInteraction(true);
    try {
      const { error } = await supabase.from("client_interactions").insert([
        {
          client_id: selectedClientId,
          type,
          content,
        },
      ]);

      if (error) throw error;

      if (!override) setNewInteraction({ type: "Nota", content: "" });
      fetchInteractions(selectedClientId);

      // Update last_contact_at
      await supabase
        .from("clients")
        .update({ last_contact_at: new Date().toISOString() })
        .eq("id", selectedClientId);
    } catch (error: any) {
      alert(`Error al guardar interacción: ${error.message}`);
    } finally {
      setIsAddingInteraction(false);
    }
  };

  // Derive all unique tags from clients
  const allTags = Array.from(
    new Set(clients.flatMap((c) => c.tags || [])),
  ).sort();

  const handleAddTag = async () => {
    if (!selectedClient || !newTag.trim()) return;

    const currentTags = selectedClient.tags || [];
    if (currentTags.includes(newTag.trim())) {
      setNewTag("");
      return;
    }

    setIsSavingTags(true);
    try {
      const updatedTags = [...currentTags, newTag.trim()];
      const { error } = await supabase
        .from("clients")
        .update({ tags: updatedTags })
        .eq("id", selectedClient.id);

      if (error) throw error;

      setClients((prev) =>
        prev.map((c) =>
          c.id === selectedClient.id ? { ...c, tags: updatedTags } : c,
        ),
      );
      setNewTag("");
    } catch (error: any) {
      alert(`Error al guardar etiquetas: ${error.message}`);
    } finally {
      setIsSavingTags(false);
    }
  };

  const handleRemoveTag = async (tagToRemove: string) => {
    if (!selectedClient || !selectedClient.tags) return;

    setIsSavingTags(true);
    try {
      const updatedTags = selectedClient.tags.filter((t) => t !== tagToRemove);
      const { error } = await supabase
        .from("clients")
        .update({ tags: updatedTags })
        .eq("id", selectedClient.id);

      if (error) throw error;

      setClients((prev) =>
        prev.map((c) =>
          c.id === selectedClient.id ? { ...c, tags: updatedTags } : c,
        ),
      );
    } catch (error: any) {
      alert(`Error al eliminar etiqueta: ${error.message}`);
    } finally {
      setIsSavingTags(false);
    }
  };

  const handleCreateGoogleCalendarEvent = () => {
    if (!selectedClient) return;

    const dateStr = followupData.date.replace(/-/g, "");
    const timeStr = followupData.time.replace(/:/g, "") + "00";
    const startDateTime = `${dateStr}T${timeStr}`;

    const [hours, minutes] = followupData.time.split(":").map(Number);
    const endMinutes = minutes + 30;
    const endHours = hours + Math.floor(endMinutes / 60);
    const finalMinutes = endMinutes % 60;
    const endDateTime = `${dateStr}T${endHours.toString().padStart(2, "0")}${finalMinutes.toString().padStart(2, "0")}00`;

    const title = encodeURIComponent(
      `${followupData.title || `Seguimiento: ${followupData.type}`} - ${selectedClient.full_name || selectedClient.company_name}`,
    );
    const details = encodeURIComponent(
      `${followupData.description}\n\nCliente: ${selectedClient.full_name}\nTel: ${selectedClient.phone}\nEmail: ${selectedClient.email}`,
    );

    const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startDateTime}/${endDateTime}&details=${details}`;

    window.open(url, "_blank");

    handleAddInteraction(
      {
        preventDefault: () => {},
        target: null,
      } as any,
      {
        type: followupData.type,
        content: `[PROGRAMADO EN CALENDAR] ${followupData.title || `Seguimiento`}: ${followupData.description} (Para el ${followupData.date} a las ${followupData.time})`,
      },
    );

    setShowFollowupForm(false);
  };

  useEffect(() => {
    if (selectedClientId) {
      if (activeTab === "Historial") {
        fetchClientOrders(selectedClientId);
      } else if (activeTab === "CRM") {
        fetchInteractions(selectedClientId);
      }
    }
  }, [selectedClientId, activeTab]);

  const calculateMetrics = async (allClients: Client[]) => {
    const now = new Date();
    // Start of current month
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Thirty days ago for "Nuevos" metric
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(now.getDate() - 30);

    const total = allClients.length;
    const new30d = allClients.filter(
      (c) => new Date(c.created_at) >= thirtyDaysAgo,
    ).length;

    let activeMonth = 0;
    try {
      const { data: orderData } = await supabase
        .from("orders")
        .select("client_id, created_at")
        .gte("created_at", startOfMonth.toISOString());

      if (orderData) {
        const uniqueClients = new Set(orderData.map((o) => o.client_id));
        activeMonth = uniqueClients.size;
      }
    } catch (e) {
      console.log("Orders table check failed, using fallback metrics");
      activeMonth = 0;
    }

    setMetrics(prev => ({ ...prev, total, activeMonth, new30d }));
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [
    searchTerm,
    statusFilter,
    typeFilter,
    showOnlyNew,
    tagFilter,
    sourceFilter,
  ]);

  const filteredClients = clients.filter((client) => {
    const searchStr = searchTerm.toLowerCase();
    const matchesSearch =
      client.full_name?.toLowerCase().includes(searchStr) ||
      client.company_name?.toLowerCase().includes(searchStr) ||
      client.document_number?.includes(searchStr) ||
      client.document_info?.includes(searchStr) ||
      client.email?.toLowerCase().includes(searchStr) ||
      client.phone?.includes(searchStr);

    const matchesStatus =
      statusFilter === "all" || client.status === statusFilter;
    const matchesType =
      typeFilter === "all" || client.client_type === typeFilter;
    const matchesSource =
      sourceFilter === "all" ||
      (sourceFilter === "Nuevo" && client.source === "Nuevo") ||
      (sourceFilter === "Mercado Libre" && client.source === "Mercado Libre") ||
      (sourceFilter.startsWith("brand_") &&
        client.referred_by_brand_id === parseInt(sourceFilter.split("_")[1]));
    const matchesTag =
      tagFilter === "all" || (client.tags && client.tags.includes(tagFilter));

    let matchesNew = true;
    if (showOnlyNew) {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      matchesNew = new Date(client.created_at) >= thirtyDaysAgo;
    }

    return (
      matchesSearch &&
      matchesStatus &&
      matchesType &&
      matchesNew &&
      matchesSource &&
      matchesTag
    );
  });

  const totalPages = Math.ceil(filteredClients.length / ITEMS_PER_PAGE);
  const paginatedClients = filteredClients.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  const startItem = (currentPage - 1) * ITEMS_PER_PAGE + 1;
  const endItem = Math.min(
    currentPage * ITEMS_PER_PAGE,
    filteredClients.length,
  );

  const handleClearFilters = () => {
    setStatusFilter("all");
    setTypeFilter("all");
    setSourceFilter("all");
    setTagFilter("all");
    setShowOnlyNew(false);
  };

  const handleExport = () => {
    if (filteredClients.length === 0) {
      alert("No hay clientes para exportar");
      return;
    }

    const exportData = filteredClients.map((c) => {
      const referralBrand = c.referred_by_brand_id
        ? brands.find((b) => b.id === c.referred_by_brand_id)?.name
        : "";

      let detailedSource = c.source || "Nuevo";
      if (c.client_type === 'Empresa' && c.source_type) {
        detailedSource = c.source_type;
        if (c.source_sub_type) detailedSource += `: ${c.source_sub_type}`;
        if (c.source_type === 'Referido por cliente' && referralBrand) detailedSource += ` (${referralBrand})`;
      } else if (c.source === "Referido por marca" && referralBrand) {
        detailedSource = `Referido: ${referralBrand}`;
      }

      return {
        ID: c.id,
        "Nombre/Contacto": c.client_type === 'Empresa' ? (c.contact_person || 'Sin contacto') : c.full_name,
        Empresa: c.client_type === 'Empresa' ? c.full_name : "N/A",
        Tipo: c.client_type,
        Documento: c.document_number,
        "Info Doc/NIT": c.document_info || c.nit || "N/A",
        Email: c.email || "N/A",
        Teléfono: c.phone || "N/A",
        WhatsApp: c.whatsapp || "N/A",
        Departamento: c.department || "N/A",
        Municipio: c.municipality || "N/A",
        Dirección: c.address || "N/A",
        Procedencia: detailedSource,
        Asesor: c.assigned_to_name || "Sin asignar",
        Etiquetas: c.tags ? c.tags.join(", ") : "",
        Estado: c.status,
        "Fecha Registro": new Date(c.created_at).toLocaleDateString(),
      };
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Clientes");
    XLSX.writeFile(wb, "mundolar-clientes.xlsx");
  };

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => {
    const { name, value } = e.target;

    if (name === "referred_by_brand_id") {
      setFormData((prev) => ({ ...prev, [name]: parseInt(value) || 0 }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }

    // Reset municipality if department changes
    if (name === "department") {
      setFormData((prev) => ({ ...prev, municipality: "" }));
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleGenerateReport = async () => {
    setIsGeneratingReport(true);
    try {
      // 1. Fetch clients created in the range
      const { data: reportClients, error: clientsError } = await supabase
        .from("clients")
        .select("*")
        .gte("created_at", `${reportStartDate}T00:00:00`)
        .lte("created_at", `${reportEndDate}T23:59:59`)
        .order("created_at", { ascending: true });

      if (clientsError) throw clientsError;
      if (!reportClients || reportClients.length === 0) {
        alert("No se encontraron clientes creados en este rango de fechas.");
        setIsGeneratingReport(false);
        return;
      }

      const clientIds = reportClients.map((c) => c.id);

      // 2. Fetch interactions for these clients
      const { data: allInteractions, error: intError } = await supabase
        .from("client_interactions")
        .select("*")
        .in("client_id", clientIds)
        .order("created_at", { ascending: true });

      if (intError) throw intError;

      // 3. Fetch orders for these clients in the SAME range
      const { data: allOrders, error: orderError } = await supabase
        .from("orders")
        .select("id, client_id, created_at")
        .in("client_id", clientIds)
        .gte("created_at", `${reportStartDate}T00:00:00`)
        .lte("created_at", `${reportEndDate}T23:59:59`);

      if (orderError) throw orderError;

      // 4. Map data for XLSX
      const reportData = reportClients.map((client) => {
        const clientInteractions = (allInteractions || []).filter(
          (i) => i.client_id === client.id,
        );
        const clientOrdersInRange = (allOrders || []).filter(
          (o) => o.client_id === client.id,
        );

        // Format Timeline: [DD/MM] Tipo: Contenido
        const timeline = clientInteractions
          .map((i) => {
            const date = new Date(i.created_at).toLocaleDateString("es-CO", {
              day: "2-digit",
              month: "2-digit",
            });
            return `[${date}] ${i.type}: ${i.content}`;
          })
          .join(" | ");

        // Format Orders: ID1, ID2, ID3
        const orderIds = clientOrdersInRange.map((o) => o.id).join(", ");

        const rangeStr = `${reportStartDate} / ${reportEndDate}`;

        return {
          "Rango del informe": rangeStr,
          Empresa: client.client_type === "Empresa" ? client.full_name : "N/A",
          Contacto:
            client.client_type === "Empresa"
              ? client.contact_person
              : client.full_name,
          Teléfono: client.phone || "N/A",
          Email: client.email || "N/A",
          Requerimientos: client.notes || "Sin requerimientos",
          "Id de pedidos": orderIds || "Sin pedidos en el rango",
          "Linea de tiempo": timeline || "Sin interacciones registradas",
        };
      });

      // 5. Generate XLSX
      const ws = XLSX.utils.json_to_sheet(reportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Informe de Clientes");

      // Column widths
      const wscols = [
        { wch: 25 }, // Rango
        { wch: 30 }, // Empresa
        { wch: 25 }, // Contacto
        { wch: 15 }, // Telefono
        { wch: 30 }, // Email
        { wch: 40 }, // Requerimientos
        { wch: 20 }, // Pedidos
        { wch: 60 }, // Timeline
      ];
      ws["!cols"] = wscols;

      XLSX.writeFile(
        wb,
        `Informe_Clientes_${reportStartDate}_${reportEndDate}.xlsx`,
      );
      setIsReportModalOpen(false);
    } catch (err) {
      console.error("Error generating report:", err);
      alert("Hubo un error al generar el informe.");
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (
      formData.source === "Referido por marca" &&
      !formData.referred_by_brand_id
    ) {
      alert("Por favor selecciona una marca referida.");
      setIsSubmitting(false);
      return;
    }

    try {
      let photo_url = selectedClient?.photo_url || "";
      if (imageFile) {
        const fileExt = imageFile.name.split(".").pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `client-photos/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("client_images")
          .upload(filePath, imageFile);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from("client_images")
          .getPublicUrl(filePath);

        photo_url = urlData.publicUrl;
      }

      const payload = {
        full_name: formData.full_name,
        email: formData.email,
        phone: formData.phone,
        department: formData.department,
        municipality: formData.municipality,
        address: formData.address,
        notes: formData.notes,
        client_type: clientType,
        document_number: formData.document_number,
        document_type: clientType === 'Natural' ? formData.document_type : 'NIT',
        status: isEditMode ? selectedClient?.status : 'Inactivo',
        nit: clientType === 'Empresa' ? formData.document_number : null,
        contact_person: clientType === 'Empresa' ? formData.contact_person : null,
        position: clientType === 'Empresa' ? formData.position : null,
        whatsapp: clientType === 'Empresa' ? formData.whatsapp : null,
        industry_sector: formData.industry_sector,
        industry: formData.industry_sector,
        source: formData.source_type, // Maintain source as primary category
        source_type: formData.source_type,
        source_sub_type: formData.source_sub_type,
        referred_by_brand_id: (formData.source_type === 'Referido por marca' || formData.source_type === 'Referido por cliente') ? formData.referred_by_brand_id : null,
        assigned_to_name: clientType === 'Empresa' ? formData.assigned_to_name : null,
        photo_url: clientType === 'Natural' ? photo_url : null,
      };

      let error;
      if (isEditMode && editingClientId) {
        const { error: updateError } = await supabase
          .from("clients")
          .update(payload)
          .eq("id", editingClientId);
        error = updateError;
      } else {
        const { error: insertError } = await supabase
          .from("clients")
          .insert([payload]);
        error = insertError;
      }

      if (error) throw error;

      setIsModalOpen(false);
      resetForm();
      fetchClients();
    } catch (error: any) {
      if (error.message?.includes("bucket_not_found") || error.status === 400) {
        alert(
          `Error de Almacenamiento: Asegúrate de que existe el bucket 'client_images' en Supabase Storage.`,
        );
      } else {
        alert(`Error al guardar cliente: ${error.message}`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditClick = (client: Client) => {
    setEditingClientId(client.id);
    setIsEditMode(true);
    setClientType(client.client_type);
    setFormData({
      full_name: client.full_name || '',
      company_name: '', // Not used anymore
      document_type: client.document_type || 'C.C',
      document_number: client.document_number || '',
      document_info: '', // Not used anymore
      nit: client.nit || '',
      contact_person: client.contact_person || '',
      position: client.position || '',
      whatsapp: client.whatsapp || '',
      phone: client.phone || '',
      email: client.email || '',
      department: client.department || '',
      municipality: client.municipality || '',
      address: client.address || '',
      notes: client.notes || '',
      industry: client.industry || '', // Keep for compatibility
      industry_sector: client.industry_sector || '',
      source: client.source || 'Nuevo', // Keep for compatibility
      source_type: client.source_type || 'Nuevo',
      source_sub_type: client.source_sub_type || '',
      referred_by_brand_id: client.referred_by_brand_id as number || 0,
      assigned_to_name: client.assigned_to_name || ''
    });
    setImagePreview(client.photo_url);
    setIsModalOpen(true);
  };

  const handleOpenNewModal = () => {
    setIsEditMode(false);
    setEditingClientId(null);
    resetForm();
    setIsModalOpen(true);
  };

  const resetForm = () => {
    setFormData({
      full_name: '',
      company_name: '',
      document_type: 'C.C',
      document_number: '',
      document_info: '',
      nit: '',
      contact_person: '',
      position: '',
      whatsapp: '',
      phone: '',
      email: '',
      department: '',
      municipality: '',
      address: '',
      notes: '',
      industry: '',
      industry_sector: '',
      source: 'Nuevo',
      source_type: 'Nuevo',
      source_sub_type: '',
      referred_by_brand_id: 0,
      assigned_to_name: ''
    });
    setImageFile(null);
    setImagePreview(null);
    setClientType("Natural");
  };

  const handleDeleteClient = async () => {
    if (!selectedClient) return;

    try {
      setIsSubmitting(true);

      // 1. Delete image from storage if it exists
      if (selectedClient.photo_url) {
        try {
          const url = new URL(selectedClient.photo_url);
          const pathParts = url.pathname.split("/");
          const fileName = pathParts[pathParts.length - 1];
          const filePath = `client-photos/${fileName}`;

          await supabase.storage.from("client_images").remove([filePath]);
        } catch (storageErr) {
          console.error("Error deleting image from storage:", storageErr);
        }
      }

      // 2. Delete from database
      const { error } = await supabase
        .from("clients")
        .delete()
        .eq("id", selectedClient.id);

      if (error) throw error;

      setIsDeleteModalOpen(false);
      setSelectedClientId(null);
      fetchClients();
    } catch (error: any) {
      alert(`Error al eliminar cliente: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-6 py-5 shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight font-display">
            {viewTab === "Clientes" ? "Gestión de Clientes" : "Gestión de Tareas CRM"}
          </h2>
          <p className="text-slate-500 text-sm font-display">
            {viewTab === "Clientes" 
              ? "Administra la base de datos de clientes, historiales y notas."
              : "Asignación y seguimiento de tareas para asesores y equipo."}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {viewTab === "Tareas" && (
            <button
              onClick={() => {
                setIsEditingTask(false);
                setTaskFormData({
                  title: "",
                  description: "",
                  due_date: new Date().toISOString().split("T")[0],
                  assigned_to: "",
                  client_id: "",
                  status: "Pendiente",
                });
                setIsTaskModalOpen(true);
              }}
              className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-lg font-bold text-sm transition-colors shadow-sm shadow-emerald-500/30 font-display"
            >
              <span className="material-symbols-outlined text-[20px]">
                add_task
              </span>
              <span>Nueva Tarea</span>
            </button>
          )}
          {viewTab === "Clientes" && (
            <button
              onClick={handleOpenNewModal}
              className="flex items-center justify-center gap-2 bg-primary hover:bg-blue-600 text-white px-5 py-2.5 rounded-lg font-bold text-sm transition-colors shadow-sm shadow-primary/30 font-display"
            >
              <span className="material-symbols-outlined text-[20px]">
                person_add
              </span>
              <span>Nuevo Cliente</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Tabs */}
      <div className="bg-white border-b border-slate-200 px-6 shrink-0 flex items-center gap-8">
        <button
          onClick={() => setViewTab("Clientes")}
          className={`py-4 text-sm font-bold transition-all relative font-display ${
            viewTab === "Clientes"
              ? "text-primary"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          Directorio de Clientes
          {viewTab === "Clientes" && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full" />
          )}
        </button>
        <button
          onClick={() => setViewTab("Tareas")}
          className={`py-4 text-sm font-bold transition-all relative font-display ${
            viewTab === "Tareas"
              ? "text-primary"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          Gestión de Tareas
          {metrics.pendingTasks > 0 && (
            <span className="ml-2 bg-red-100 text-red-600 text-[10px] px-1.5 py-0.5 rounded-full">
              {metrics.pendingTasks}
            </span>
          )}
          {viewTab === "Tareas" && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full" />
          )}
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6">
            <div className={`grid grid-cols-1 ${viewTab === 'Clientes' ? 'md:grid-cols-4' : 'md:grid-cols-4'} gap-4 mb-6`}>
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-start justify-between">
                <div>
                  <p className="text-slate-500 text-sm font-medium mb-1 font-display">
                    Total Clientes
                  </p>
                  <p className="text-3xl font-bold text-slate-900 font-display">
                    {metrics.total.toLocaleString()}
                  </p>
                </div>
                <span className="flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md text-xs font-bold font-display">
                  <span className="material-symbols-outlined text-sm">
                    group
                  </span>
                </span>
              </div>
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-start justify-between">
                <div>
                  <p className="text-slate-500 text-sm font-medium mb-1 font-display">
                    Activos este Mes
                  </p>
                  <p className="text-3xl font-bold text-slate-900 font-display">
                    {metrics.activeMonth.toLocaleString()}
                  </p>
                </div>
                <span className="flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md text-xs font-bold font-display">
                  <span className="material-symbols-outlined text-sm">
                    trending_up
                  </span>
                </span>
              </div>
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-start justify-between">
                <div>
                  <p className="text-slate-500 text-sm font-medium mb-1 font-display">
                    Nuevos (30d)
                  </p>
                  <p className="text-3xl font-bold text-slate-900 font-display">
                    {metrics.new30d.toLocaleString()}
                  </p>
                </div>
                <span className="flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md text-xs font-bold font-display">
                  <span className="material-symbols-outlined text-sm">
                    new_releases
                  </span>
                </span>
              </div>
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-start justify-between">
                <div>
                  <p className="text-slate-500 text-sm font-medium mb-1 font-display">
                    Tareas Pendientes
                  </p>
                  <p className="text-3xl font-bold text-slate-900 font-display">
                    {metrics.pendingTasks.toLocaleString()}
                  </p>
                </div>
                <span className="flex items-center gap-1 text-orange-600 bg-orange-50 px-2 py-1 rounded-md text-xs font-bold font-display">
                  <span className="material-symbols-outlined text-sm">
                    task_alt
                  </span>
                </span>
              </div>
            </div>


            {viewTab === "Clientes" ? (
              <>
                <div className="flex flex-col gap-4 mb-6">
                  <div className="flex flex-col md:flex-row gap-3">
                    <div className="flex-1 relative">
                      <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                        search
                      </span>
                      <input
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg pl-10 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none text-slate-900 placeholder-slate-400 shadow-[0_4px_12px_rgba(0,0,0,0.15)] font-display"
                        placeholder="Buscar por nombre, empresa o email..."
                        type="text"
                      />
                    </div>

                    <div className="relative" ref={dropdownRef}>
                      <button
                        onClick={() =>
                          setIsFilterDropdownOpen(!isFilterDropdownOpen)
                        }
                        className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors shadow-[0_2px_4px_rgba(0,0,0,0.05)] font-display"
                      >
                        <span className="material-symbols-outlined text-[20px]">
                          filter_list
                        </span>
                        Filtros
                        {(statusFilter !== "all" ||
                          typeFilter !== "all" ||
                          showOnlyNew) && (
                          <span className="size-2 rounded-full bg-primary animate-pulse"></span>
                        )}
                      </button>

                      {isFilterDropdownOpen && (
                        <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-200 z-50 p-4 animate-in fade-in slide-in-from-top-2 duration-200">
                          <div className="space-y-4">
                            <div>
                              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">
                                Estado
                              </label>
                              <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="w-full text-sm border-slate-200 rounded-lg focus:ring-primary py-1.5"
                              >
                                <option value="all">Todos</option>
                                <option value="Activo">Activos</option>
                                <option value="Inactivo">Inactivos</option>
                              </select>
                            </div>
                            <div>
                              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">
                                Tipo de Cliente
                              </label>
                              <select
                                value={typeFilter}
                                onChange={(e) => setTypeFilter(e.target.value)}
                                className="w-full text-sm border-slate-200 rounded-lg focus:ring-primary py-1.5"
                              >
                                <option value="all">Todos</option>
                                <option value="Natural">Persona Natural</option>
                                <option value="Empresa">Empresa</option>
                              </select>
                            </div>
                            <div>
                              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">
                                Procedencia
                              </label>
                              <select
                                value={sourceFilter}
                                onChange={(e) => setSourceFilter(e.target.value)}
                                className="w-full text-sm border-slate-200 rounded-lg focus:ring-primary py-1.5"
                              >
                                <option value="all">Todas</option>
                                <option value="Nuevo">Nuevo</option>
                                <option value="Mercado Libre">Mercado Libre</option>
                                <optgroup label="Referido por Marca">
                                  {brands.map((brand) => (
                                    <option
                                      key={brand.id}
                                      value={`brand_${brand.id}`}
                                    >
                                      {brand.name}
                                    </option>
                                  ))}
                                </optgroup>
                              </select>
                            </div>
                            <div>
                              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">
                                Etiqueta
                              </label>
                              <select
                                value={tagFilter}
                                onChange={(e) => setTagFilter(e.target.value)}
                                className="w-full text-sm border-slate-200 rounded-lg focus:ring-primary py-1.5"
                              >
                                <option value="all">Todas</option>
                                {allTags.map((tag) => (
                                  <option key={tag} value={tag}>
                                    {tag}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <label className="flex items-center gap-2 cursor-pointer pt-1">
                              <input
                                type="checkbox"
                                checked={showOnlyNew}
                                onChange={(e) => setShowOnlyNew(e.target.checked)}
                                className="rounded border-slate-300 text-primary focus:ring-primary"
                              />
                              <span className="text-sm font-medium text-slate-600">
                                Solo nuevos (30d)
                              </span>
                            </label>

                            <div className="pt-2 border-t border-slate-100 flex justify-end">
                              <button
                                onClick={handleClearFilters}
                                className="text-[11px] font-bold text-primary hover:text-blue-700 uppercase tracking-wider font-display flex items-center gap-1"
                              >
                                <span className="material-symbols-outlined text-[16px]">
                                  filter_alt_off
                                </span>
                                Limpiar Filtros
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => setIsReportModalOpen(true)}
                      className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-lg text-sm font-bold hover:bg-blue-600 transition-all shadow-md font-display"
                    >
                      <span className="material-symbols-outlined text-[20px]">
                        analytics
                      </span>
                      Informe
                    </button>

                    <button
                      onClick={handleExport}
                      className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-all shadow-[0_2px_4px_rgba(0,0,0,0.05)] font-display"
                    >
                      <span className="material-symbols-outlined text-[20px]">
                        file_upload
                      </span>
                      Exportar
                    </button>
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                          <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider font-display">
                            Cliente
                          </th>
                          <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider hidden md:table-cell font-display">
                            Empresa
                          </th>
                          <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider hidden lg:table-cell font-display">
                            Contacto
                          </th>
                          <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider hidden xl:table-cell font-display">
                            Procedencia
                          </th>
                          <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider hidden xl:table-cell font-display">
                            Asesor
                          </th>
                          <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider hidden xl:table-cell font-display">
                            Etiquetas
                          </th>
                          <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider font-display">
                            Estado
                          </th>
                          <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right font-display"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {loading ? (
                          <tr>
                            <td colSpan={7} className="p-10 text-center">
                              <div className="size-8 border-2 border-primary border-t-transparent animate-spin rounded-full mx-auto mb-2"></div>
                              <p className="text-sm text-slate-500 font-display">
                                Cargando clientes...
                              </p>
                            </td>
                          </tr>
                        ) : paginatedClients.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="p-10 text-center">
                              <p className="text-sm text-slate-500 font-display">
                                No hay clientes que coincidan con la búsqueda.
                              </p>
                            </td>
                          </tr>
                        ) : (
                          paginatedClients.map((client) => (
                            <tr
                              key={client.id}
                              onClick={() => setSelectedClientId(client.id)}
                              className={`group hover:bg-slate-50 transition-colors cursor-pointer ${selectedClientId === client.id ? "bg-primary/5 border-l-4 border-l-primary" : "border-l-4 border-l-transparent"}`}
                            >
                              <td className="p-4">
                                <div className="flex items-center gap-3">
                                  <div className="size-10 rounded-full overflow-hidden relative border border-slate-100 shadow-sm bg-slate-100 flex items-center justify-center">
                                    {client.photo_url ? (
                                      <Image
                                        src={client.photo_url}
                                        alt={
                                          client.full_name ||
                                          client.company_name ||
                                          ""
                                        }
                                        fill
                                        sizes="40px"
                                        className="object-cover"
                                      />
                                    ) : (
                                      <span className="material-symbols-outlined text-slate-400">
                                        {client.client_type === 'Empresa' ? 'corporate_fare' : 'person'}
                                      </span>
                                    )}
                                  </div>
                                  <div>
                                    <p className="font-bold text-slate-900 text-sm font-display">
                                      {client.client_type === 'Empresa' ? (client.contact_person || 'Sin contacto') : client.full_name}
                                    </p>
                                    <p className="text-xs text-slate-500 font-display">
                                      {client.client_type === "Natural"
                                        ? "Persona Natural"
                                        : "Empresa"}
                                    </p>
                                  </div>
                                </div>
                              </td>
                              <td className="p-4 hidden md:table-cell">
                                <div className="flex items-center gap-2">
                                  <span className="material-symbols-outlined text-slate-400 text-[18px]">
                                    {client.client_type === "Natural"
                                      ? "person"
                                      : "domain"}
                                  </span>
                                  <span className="text-sm text-slate-700 font-display">
                                    {client.client_type === 'Empresa' ? client.full_name : "N/A"}
                                  </span>
                                </div>
                              </td>
                              <td className="p-4 hidden lg:table-cell">
                                <div className="flex flex-col font-display">
                                  <span className="text-sm text-slate-700">
                                    {client.email}
                                  </span>
                                  <span className="text-xs text-slate-500">
                                    {client.phone}
                                  </span>
                                </div>
                              </td>
                              <td className="p-4 hidden xl:table-cell">
                                <div className="flex flex-col font-display">
                                  <span className="text-sm text-slate-700 font-medium">
                                    {client.source_type || client.source || 'Nuevo'}
                                  </span>
                                  {client.source_sub_type && (
                                    <span className="text-xs text-slate-500 italic">
                                      {client.source_type === 'Redes sociales' ? 'Red: ' : 
                                       client.source_type === 'Gestion marketing' ? 'Mkt: ' : 
                                       client.source_type === 'Referido por cliente' ? 'Ref: ' : ''}
                                      {client.source_sub_type}
                                    </span>
                                  )}
                                  {client.referred_by_brand_id && client.source_type === 'Referido por marca' && (
                                    <span className="text-xs text-slate-500">
                                      Marca: {brands.find(b => b.id === client.referred_by_brand_id)?.name || "Marca"}
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="p-4 hidden xl:table-cell">
                                 <div className="flex items-center gap-2">
                                   <span className="material-symbols-outlined text-slate-400 text-[18px]">
                                     person_pin
                                   </span>
                                   <span className="text-sm text-slate-700 font-display">
                                     {client.assigned_to_name || "Sin asignar"}
                                   </span>
                                 </div>
                              </td>
                              <td className="p-4 hidden xl:table-cell">
                                <div className="flex flex-wrap gap-1 max-w-[200px]">
                                  {client.tags && client.tags.length > 0 ? (
                                    client.tags.slice(0, 3).map((tag) => (
                                      <span
                                        key={tag}
                                        className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-bold border border-slate-200"
                                      >
                                        {tag}
                                      </span>
                                    ))
                                  ) : (
                                    <span className="text-xs text-slate-400">
                                      -
                                    </span>
                                  )}
                                  {client.tags && client.tags.length > 3 && (
                                    <span className="px-1.5 py-0.5 text-[10px] text-slate-400 font-medium">
                                      +{client.tags.length - 3}
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="p-4 whitespace-nowrap">
                                <span
                                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${client.status === "Activo" ? "bg-emerald-100 text-emerald-700 border-emerald-200" : "bg-slate-100 text-slate-700 border-slate-200"} font-display border`}
                                >
                                  <span
                                    className={`size-1.5 rounded-full ${client.status === "Activo" ? "bg-emerald-500" : "bg-slate-400"}`}
                                  ></span>
                                  {client.status}
                                </span>
                              </td>
                              <td className="p-4 text-right">
                                <button className="p-2 text-slate-400 hover:text-primary transition-colors">
                                  <span className="material-symbols-outlined">
                                    chevron_right
                                  </span>
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                  <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-slate-200 sm:px-6">
                    <div className="flex-1 flex justify-between sm:hidden">
                      <button
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                      >
                        Anterior
                      </button>
                      <button
                        onClick={() =>
                          setCurrentPage((p) => Math.min(totalPages, p + 1))
                        }
                        disabled={currentPage === totalPages}
                        className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                      >
                        Siguiente
                      </button>
                    </div>
                    <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm text-slate-700 font-display">
                          Mostrando{" "}
                          <span className="font-medium">
                            {filteredClients.length > 0 ? startItem : 0}
                          </span>{" "}
                          a <span className="font-medium">{endItem}</span> de{" "}
                          <span className="font-medium">
                            {filteredClients.length}
                          </span>{" "}
                          resultados
                        </p>
                      </div>
                      {totalPages > 1 && (
                        <div>
                          <nav
                            className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px"
                            aria-label="Pagination"
                          >
                            <button
                              onClick={() =>
                                setCurrentPage((p) => Math.max(1, p - 1))
                              }
                              disabled={currentPage === 1}
                              className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-slate-300 bg-white text-sm font-medium text-slate-500 hover:bg-slate-50 disabled:opacity-50"
                            >
                              <span className="material-symbols-outlined text-[20px]">
                                chevron_left
                              </span>
                            </button>
                            {Array.from(
                              { length: totalPages },
                              (_, i) => i + 1,
                            ).map((page) => (
                              <button
                                key={page}
                                onClick={() => setCurrentPage(page)}
                                aria-current={
                                  currentPage === page ? "page" : undefined
                                }
                                className={`${
                                  currentPage === page
                                    ? "z-10 bg-primary/10 border-primary text-primary"
                                    : "bg-white border-slate-300 text-slate-500 hover:bg-slate-50"
                                } relative inline-flex items-center px-4 py-2 border text-sm font-medium transition-colors font-display`}
                              >
                                {page}
                              </button>
                            ))}
                            <button
                              onClick={() =>
                                setCurrentPage((p) => Math.min(totalPages, p + 1))
                              }
                              disabled={currentPage === totalPages}
                              className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-slate-300 bg-white text-sm font-medium text-slate-500 hover:bg-slate-50 disabled:opacity-50"
                            >
                              <span className="material-symbols-outlined text-[20px]">
                                chevron_right
                              </span>
                            </button>
                          </nav>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="space-y-6">
                {/* Task Filters & Search */}
                <div className="flex flex-col gap-4 mb-6">
                  <div className="flex flex-col md:flex-row gap-3">
                    <div className="flex-1 relative">
                      <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                        search
                      </span>
                      <input
                        value={taskSearchTerm}
                        onChange={(e) => setTaskSearchTerm(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg pl-10 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none text-slate-900 placeholder-slate-400 shadow-[0_4px_12px_rgba(0,0,0,0.15)] font-display"
                        placeholder="Buscar por ID o Título de tarea..."
                        type="text"
                      />
                    </div>
                    
                    <div className="relative" ref={taskDropdownRef}>
                      <button
                        onClick={() =>
                          setIsTaskFilterDropdownOpen(!isTaskFilterDropdownOpen)
                        }
                        className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors shadow-[0_2px_4px_rgba(0,0,0,0.05)] font-display"
                      >
                        <span className="material-symbols-outlined text-[20px]">
                          filter_list
                        </span>
                        Filtros
                        {(taskStatusFilter !== "all" ||
                          taskAdvisorFilter !== "all" ||
                          taskDueSoonFilter) && (
                          <span className="size-2 rounded-full bg-primary animate-pulse"></span>
                        )}
                      </button>

                      {isTaskFilterDropdownOpen && (
                        <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-200 z-50 p-4 animate-in fade-in slide-in-from-top-2 duration-200">
                          <div className="space-y-4">
                            <div>
                              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">
                                Estado
                              </label>
                              <select
                                value={taskStatusFilter}
                                onChange={(e) => setTaskStatusFilter(e.target.value)}
                                className="w-full text-sm border-slate-200 rounded-lg focus:ring-primary py-1.5"
                              >
                                <option value="all">Todos los Estados</option>
                                <option value="Pendiente">Pendientes</option>
                                <option value="Completada">Completadas</option>
                                <option value="Cancelada">Canceladas</option>
                              </select>
                            </div>

                            <div>
                              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">
                                Asesor
                              </label>
                              <select
                                value={taskAdvisorFilter}
                                onChange={(e) => setTaskAdvisorFilter(e.target.value)}
                                className="w-full text-sm border-slate-200 rounded-lg focus:ring-primary py-1.5"
                              >
                                <option value="all">Todos los Asesores</option>
                                {Array.from(new Set(tasks.map(t => t.assigned_to).filter(Boolean))).map(advisor => (
                                  <option key={advisor} value={advisor!}>{advisor}</option>
                                ))}
                              </select>
                            </div>

                            <div className="pt-2 border-t border-slate-100">
                              <button
                                onClick={() => setTaskDueSoonFilter(!taskDueSoonFilter)}
                                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-bold transition-all border ${
                                  taskDueSoonFilter 
                                    ? "bg-red-50 text-red-600 border-red-200 shadow-sm" 
                                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <span className="material-symbols-outlined text-sm">
                                    event_busy
                                  </span>
                                  <span>Vence {"<"} 3 días</span>
                                </div>
                                {taskDueSoonFilter && (
                                  <span className="material-symbols-outlined text-sm">check_circle</span>
                                )}
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Task Table */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                          <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider font-display">ID</th>
                          <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider font-display">Tarea</th>
                          <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider font-display">Asignado</th>
                          <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider font-display">Cliente</th>
                          <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider font-display">Vencimiento</th>
                          <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider font-display">Estado</th>
                          <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right font-display whitespace-nowrap">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {loadingTasks ? (
                          <tr>
                            <td colSpan={7} className="px-6 py-10 text-center">
                              <div className="size-6 border-2 border-primary border-t-transparent animate-spin rounded-full mx-auto mb-2"></div>
                              <p className="text-sm text-slate-500 font-display">Cargando tareas...</p>
                            </td>
                          </tr>
                        ) : tasks.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="px-6 py-10 text-center">
                              <p className="text-sm text-slate-500 font-display">No hay tareas registradas.</p>
                            </td>
                          </tr>
                        ) : (
                          tasks
                            .filter(task => {
                              const searchStr = taskSearchTerm.toLowerCase();
                              const paddedCodigo = (task.codigo?.toString() || "").padStart(4, "0");
                              const matchesSearch = task.title.toLowerCase().includes(searchStr) || 
                                                  paddedCodigo.includes(searchStr) ||
                                                  (task.codigo?.toString() || "").includes(searchStr);
                              const matchesStatus = taskStatusFilter === 'all' || task.status === taskStatusFilter;
                              const matchesAdvisor = taskAdvisorFilter === 'all' || task.assigned_to === taskAdvisorFilter;
                              
                              let matchesDueSoon = true;
                              if (taskDueSoonFilter) {
                                const dueDate = new Date(task.due_date);
                                const diff = dueDate.getTime() - new Date().getTime();
                                const days = diff / (1000 * 60 * 60 * 24);
                                matchesDueSoon = days >= 0 && days <= 3;
                              }

                              return matchesSearch && matchesStatus && matchesAdvisor && matchesDueSoon;
                            })
                            .map((task) => (
                            <tr 
                              key={task.id} 
                              onClick={() => setSelectedTaskId(task.id)}
                              className={`hover:bg-slate-50 group transition-colors cursor-pointer ${selectedTaskId === task.id ? 'bg-blue-50/50' : ''}`}
                            >
                              <td className="px-6 py-4">
                                <span className="inline-flex items-center justify-center px-2 py-1 rounded bg-slate-100 text-slate-600 text-[10px] font-bold font-mono border border-slate-200 shadow-sm">
                                  #{task.codigo?.toString().padStart(4, "0")}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                <p className="text-sm font-bold text-slate-900 mb-0.5 font-display">{task.title}</p>
                                {task.description && (
                                  <p className="text-xs text-slate-500 line-clamp-1 font-display">{task.description}</p>
                                )}
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-2">
                                  <div className="size-6 rounded-full bg-slate-100 flex items-center justify-center">
                                    <span className="material-symbols-outlined text-[14px] text-slate-400">person</span>
                                  </div>
                                  <span className="text-xs text-slate-700 font-medium font-display">{task.assigned_to || 'Sin asignar'}</span>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                {task.client ? (
                                  <p className="text-xs text-slate-700 font-medium font-display">
                                    {task.client.full_name || task.client.company_name}
                                  </p>
                                ) : (
                                  <span className="text-xs text-slate-400 font-display">Sin cliente</span>
                                )}
                              </td>
                              <td className="px-6 py-4">
                                <span className={`text-xs font-medium font-display ${
                                  new Date(task.due_date) < new Date() && task.status === 'Pendiente'
                                    ? "text-red-600 font-bold" 
                                    : "text-slate-600"
                                }`}>
                                  {new Date(task.due_date).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' })}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                <select
                                  value={task.status}
                                  onChange={(e) => handleUpdateTaskStatus(task.id, e.target.value as Task["status"])}
                                  className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full border cursor-pointer font-display ${
                                    task.status === 'Pendiente' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                                    task.status === 'Completada' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                    'bg-slate-50 text-slate-700 border-slate-200'
                                  }`}
                                >
                                  <option value="Pendiente">Pendiente</option>
                                  <option value="Completada">Completada</option>
                                  <option value="Cancelada">Cancelada</option>
                                </select>
                              </td>
                              <td className="px-6 py-4 text-right">
                                <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                                  <button 
                                    onClick={() => {
                                      setEditingTaskId(task.id);
                                      setIsEditingTask(true);
                                      setTaskFormData({
                                        title: task.title,
                                        description: task.description || "",
                                        due_date: task.due_date.split('T')[0],
                                        assigned_to: task.assigned_to || "",
                                        client_id: task.client_id || "",
                                        status: task.status,
                                      });
                                      setIsTaskModalOpen(true);
                                    }}
                                    className="p-1.5 text-slate-400 hover:text-blue-600 transition-colors"
                                  >
                                    <span className="material-symbols-outlined text-[18px]">edit</span>
                                  </button>
                                  <button 
                                    onClick={() => handleDeleteTask(task.id)}
                                    className="p-1.5 text-slate-400 hover:text-red-600 transition-colors"
                                  >
                                    <span className="material-symbols-outlined text-[18px]">delete</span>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <aside 
          className={`bg-white border-l border-slate-200 transition-all duration-300 ease-in-out flex flex-col overflow-hidden ${
            (viewTab === 'Clientes' && selectedClientId) || (viewTab === 'Tareas' && selectedTaskId) ? "w-full lg:w-[500px] opacity-100" : "w-0 opacity-0 border-none"
          }`}
        >
          <div className="min-w-[500px] h-full flex flex-col">
            {(() => {
              if (viewTab === 'Clientes') {
                if (!selectedClient) {
                  return (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-white">
              <span className="material-symbols-outlined text-5xl text-slate-200 mb-4">
                person_search
              </span>
              <p className="text-slate-500 font-display">
                Selecciona un cliente para ver su perfil detallado.
              </p>
            </div>
                  );
                } else {
                  return (
            <div className="flex flex-col h-full bg-white relative">
              {/* Botón de Cierre */}
              <button 
                onClick={() => setSelectedClientId(null)}
                className="absolute top-6 right-6 size-10 flex items-center justify-center text-slate-400 hover:text-red-500 transition-all z-20"
                title="Cerrar detalles"
              >
                <span className="material-symbols-outlined text-[28px]">close</span>
              </button>

              <div className="p-8 flex-1 overflow-y-auto">
              <div className="flex justify-between items-start mb-6 pr-8">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-400 font-display">
                  Perfil del Cliente
                </div>
                <div
                  className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${selectedClient.status === "Activo" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}
                >
                  {selectedClient.status}
                </div>
              </div>
              <div className="flex flex-col items-center text-center mb-6">
                <h3 className="text-xl font-bold text-slate-900 font-display">
                  {selectedClient.client_type === 'Empresa' ? (selectedClient.contact_person || 'Sin contacto') : selectedClient.full_name}
                </h3>
                <p className="text-slate-500 text-sm mb-3 font-display">
                  {selectedClient.client_type === "Empresa"
                    ? "Corporativo"
                    : "Persona Natural"}
                </p>
                
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3 h-8 rounded-full text-xs font-bold bg-blue-50 text-blue-700 font-display border border-blue-100">
                    {selectedClient.document_type}:{" "}
                    {selectedClient.document_number}
                  </span>

                  {(selectedClient.industry_sector || selectedClient.industry) && (
                    <span className="inline-flex items-center gap-1.5 px-3 h-8 rounded-full bg-slate-100 text-slate-600 text-xs font-bold font-display border border-slate-200">
                      <span className="material-symbols-outlined text-[16px]">
                        factory
                      </span>
                      {selectedClient.industry_sector || selectedClient.industry}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex gap-2 mb-6 border-b border-slate-200 pb-1">
                <button
                  onClick={() => setActiveTab("General")}
                  className={`flex-1 pb-2 text-sm font-bold border-b-2 transition-all font-display ${activeTab === "General" ? "border-primary text-primary" : "border-transparent text-slate-400 hover:text-slate-600"}`}
                >
                  General
                </button>
                <button
                  onClick={() => setActiveTab("Historial")}
                  className={`flex-1 pb-2 text-sm font-bold border-b-2 transition-all font-display ${activeTab === "Historial" ? "border-primary text-primary" : "border-transparent text-slate-400 hover:text-slate-600"}`}
                >
                  Historial
                </button>
                <button
                  onClick={() => setActiveTab("CRM")}
                  className={`flex-1 pb-2 text-sm font-bold border-b-2 transition-all font-display ${activeTab === "CRM" ? "border-primary text-primary" : "border-transparent text-slate-400 hover:text-slate-600"}`}
                >
                  CRM
                </button>
              </div>

              <div className="pb-8">
                {activeTab === "General" ? (
                  <div className="space-y-6">
                    <div className="space-y-3">
                      <h4 className="text-sm font-bold text-slate-900 font-display uppercase tracking-widest text-[11px] text-slate-400">
                        Información de Contacto
                      </h4>
                      <div className="flex items-center gap-3 text-sm text-slate-600 font-display">
                        <div className="size-8 rounded-lg bg-slate-50 flex items-center justify-center shrink-0 border border-slate-100">
                          <span className="material-symbols-outlined text-[18px] text-slate-400">
                            mail
                          </span>
                        </div>
                        <a
                          href={`mailto:${selectedClient.email}`}
                          className="text-primary hover:underline transition-all"
                        >
                          {selectedClient.email || "No registrado"}
                        </a>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-slate-600 font-display">
                        <div className="size-8 rounded-lg bg-slate-50 flex items-center justify-center shrink-0 border border-slate-100">
                          <span className="material-symbols-outlined text-[18px] text-slate-400">
                            phone
                          </span>
                        </div>
                        {selectedClient.phone ? (
                          <a
                            href={`https://wa.me/${selectedClient.phone.replace(/\D/g, "")}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline transition-all"
                          >
                            {selectedClient.phone}
                          </a>
                        ) : (
                          <span>No registrado</span>
                        )}
                      </div>
                      <div className="flex items-start gap-3 text-sm text-slate-600 font-display">
                        <div className="size-8 rounded-lg bg-slate-50 flex items-center justify-center shrink-0 border border-slate-100">
                          <span className="material-symbols-outlined text-[18px] text-slate-400">
                            location_on
                          </span>
                        </div>
                        <div className="flex flex-col">
                          <span>
                            {selectedClient.address || "Sin dirección"}
                          </span>
                          <span className="text-xs text-slate-400">
                            {selectedClient.municipality},{" "}
                            {selectedClient.department}
                          </span>
                        </div>
                      </div>

                      {selectedClient.client_type === 'Empresa' && (
                        <div className="flex items-center gap-3 text-sm text-slate-600 font-display">
                          <div className="size-8 rounded-lg bg-slate-50 flex items-center justify-center shrink-0 border border-slate-100">
                            <span className="material-symbols-outlined text-[18px] text-slate-400">
                              domain
                            </span>
                          </div>
                          <span className="text-sm text-slate-700 font-bold">{selectedClient.full_name}</span>
                        </div>
                      )}

                      <div className="flex items-center gap-3 text-sm text-slate-600 font-display">
                        <div className="size-8 rounded-lg bg-slate-50 flex items-center justify-center shrink-0 border border-slate-100">
                          <span className="material-symbols-outlined text-[18px] text-slate-400">
                            support_agent
                          </span>
                        </div>
                        <span className="text-sm text-slate-700 font-medium">{selectedClient.assigned_to_name || "Sin asignar"}</span>
                      </div>

                      <div className="flex items-center gap-3 text-sm text-slate-600 font-display">
                        <div className="size-8 rounded-lg bg-slate-50 flex items-center justify-center shrink-0 border border-slate-100">
                          <span className="material-symbols-outlined text-[18px] text-slate-400">
                            share
                          </span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm text-slate-700 font-medium">
                            {selectedClient.source_type || selectedClient.source || 'Nuevo'}
                          </span>
                          {selectedClient.source_sub_type && (
                            <span className="text-[10px] text-slate-500 italic">
                              {selectedClient.source_type === 'Redes sociales' ? 'Red: ' : 
                               selectedClient.source_type === 'Gestion marketing' ? 'Mkt: ' : 
                               selectedClient.source_type === 'Referido por cliente' ? 'Ref: ' : ''}
                              {selectedClient.source_sub_type}
                            </span>
                          )}
                          {selectedClient.referred_by_brand_id && selectedClient.source_type === 'Referido por marca' && (
                             <span className="text-[10px] text-primary italic font-medium">
                               Marca: {brands.find(b => b.id === selectedClient.referred_by_brand_id)?.name || "Marca"}
                             </span>
                          )}
                        </div>
                      </div>
                    </div>


                    <div className="space-y-3">
                      <h4 className="text-sm font-bold text-slate-900 font-display uppercase tracking-widest text-[11px] text-slate-400">
                        Etiquetas (Segmentación)
                      </h4>
                      <div className="flex flex-wrap gap-2 mb-3">
                        {selectedClient.tags &&
                        selectedClient.tags.length > 0 ? (
                          selectedClient.tags.map((tag) => (
                            <span
                              key={tag}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-primary/10 text-primary text-xs font-bold font-display group"
                            >
                              {tag}
                              <button
                                onClick={() => handleRemoveTag(tag)}
                                className="opacity-0 group-hover:opacity-100 hover:text-red-500 transition-all"
                              >
                                <span className="material-symbols-outlined text-[14px]">
                                  close
                                </span>
                              </button>
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-slate-400 font-display italic">
                            Sin etiquetas asignadas
                          </span>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Añadir etiqueta..."
                          value={newTag}
                          onChange={(e) => setNewTag(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && handleAddTag()}
                          className="flex-1 text-xs border-slate-200 rounded-lg focus:ring-primary py-1.5"
                        />
                        <button
                          onClick={handleAddTag}
                          disabled={isSavingTags || !newTag.trim()}
                          className="bg-slate-100 hover:bg-slate-200 text-slate-600 p-1.5 rounded-lg transition-colors disabled:opacity-50"
                        >
                          <span className="material-symbols-outlined text-[20px]">
                            add
                          </span>
                        </button>
                      </div>
                    </div>

                    <div className="pt-4 grid grid-cols-2 gap-3">
                      <button
                        onClick={() => handleEditClick(selectedClient)}
                        className="flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 text-slate-700 rounded-lg text-sm font-bold hover:bg-slate-200 transition-colors font-display"
                      >
                        <span className="material-symbols-outlined text-[18px]">
                          edit
                        </span>
                        Editar
                      </button>
                      <button
                        onClick={() => setIsDeleteModalOpen(true)}
                        disabled={isSubmitting}
                        className="flex items-center justify-center gap-2 px-4 py-2.5 bg-red-50 text-red-600 rounded-lg text-sm font-bold hover:bg-red-100 transition-colors font-display disabled:opacity-50"
                      >
                        <span className="material-symbols-outlined text-[18px]">
                          delete
                        </span>
                        {isSubmitting ? "..." : "Eliminar"}
                      </button>
                    </div>
                  </div>
                ) : activeTab === "Historial" ? (
                  <div className="space-y-4">
                    <h4 className="text-sm font-bold text-slate-900 font-display uppercase tracking-widest text-[11px] text-slate-400 mb-4">
                      Pedidos Recientes
                    </h4>

                    {loadingOrders ? (
                      <div className="p-8 text-center">
                        <div className="size-6 border-2 border-primary border-t-transparent animate-spin rounded-full mx-auto"></div>
                      </div>
                    ) : clientOrders.length === 0 ? (
                      <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                        <span className="material-symbols-outlined text-slate-300 text-3xl mb-2">
                          shopping_bag
                        </span>
                        <p className="text-xs text-slate-500 font-display">
                          Este cliente aún no tiene pedidos.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {clientOrders.map((order) => (
                          <div
                            key={order.id}
                            className="p-4 bg-white border border-slate-200 rounded-xl hover:shadow-md transition-all group"
                          >
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <p className="text-sm font-bold text-slate-900 font-display">
                                  #{order.id.toString().padStart(5, "0")}
                                </p>
                                <p className="text-[10px] text-slate-500 font-display">
                                  {new Date(
                                    order.created_at,
                                  ).toLocaleDateString()}
                                </p>
                              </div>
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                  order.status === "Completado"
                                    ? "bg-emerald-100 text-emerald-700"
                                    : order.status === "Pendiente"
                                      ? "bg-amber-100 text-amber-700"
                                      : "bg-blue-100 text-blue-700"
                                }`}
                              >
                                {order.status}
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <p className="text-sm font-bold text-primary font-mono">
                                ${formatCurrency(order.total_amount)}
                              </p>
                              <button
                                onClick={() =>
                                  router.push(`/admin/pedidos?id=${order.id}`)
                                }
                                className="text-[10px] font-bold text-slate-400 group-hover:text-primary transition-colors flex items-center gap-1"
                              >
                                DETALLES{" "}
                                <span className="material-symbols-outlined text-sm">
                                  arrow_forward
                                </span>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-6">
                    {selectedClient.notes && (
                      <div className="space-y-3 p-4 bg-amber-50 rounded-xl border border-amber-100">
                        <h4 className="text-[10px] font-bold text-amber-800 uppercase tracking-widest flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-[16px]">description</span>
                          Requerimientos
                        </h4>
                        <p className="text-xs text-amber-900 font-display leading-relaxed italic">
                          &quot;{selectedClient.notes}&quot;
                        </p>
                      </div>
                    )}
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                      <h4 className="text-xs font-bold text-slate-900 font-display uppercase tracking-widest mb-3">
                        Registrar Interacción
                      </h4>
                      <form
                        onSubmit={handleAddInteraction}
                        className="space-y-3"
                      >
                        <div className="flex gap-2">
                          {(
                            [
                              "Nota",
                              "Llamada",
                              "Reunión",
                              "Correo",
                              "Soporte",
                            ] as const
                          ).map((type) => (
                            <button
                              key={type}
                              type="button"
                              onClick={() =>
                                setNewInteraction((prev) => ({ ...prev, type }))
                              }
                              className={`flex-1 py-1 px-2 rounded-lg text-[10px] font-bold border transition-all ${newInteraction.type === type ? "bg-primary border-primary text-white shadow-sm" : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"}`}
                            >
                              {type}
                            </button>
                          ))}
                        </div>
                        <textarea
                          value={newInteraction.content}
                          onChange={(e) =>
                            setNewInteraction((prev) => ({
                              ...prev,
                              content: e.target.value,
                            }))
                          }
                          rows={3}
                          placeholder="Escribe los detalles aquí..."
                          className="w-full text-xs border-slate-200 rounded-lg focus:ring-primary p-3"
                          required
                        />
                        <button
                          type="submit"
                          disabled={
                            isAddingInteraction ||
                            !newInteraction.content.trim()
                          }
                          className="w-full bg-primary text-white py-2 rounded-lg text-xs font-bold hover:bg-blue-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                          <span className="material-symbols-outlined text-[18px]">
                            save
                          </span>
                          {isAddingInteraction
                            ? "Guardando..."
                            : "Guardar en Historial"}
                        </button>
                      </form>
                    </div>

                    <div className="bg-blue-50 p-4 rounded-xl border border-blue-200">
                      {!showFollowupForm ? (
                        <button
                          onClick={() => setShowFollowupForm(true)}
                          className="w-full flex items-center justify-center gap-2 py-2 text-primary font-bold text-xs hover:bg-blue-100/50 rounded-lg transition-all"
                        >
                          <span className="material-symbols-outlined text-[18px]">
                            calendar_add_on
                          </span>
                          Programar Seguimiento (GC)
                        </button>
                      ) : (
                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <h4 className="text-[10px] font-bold text-blue-700 uppercase tracking-widest">
                              Programar Seguimiento
                            </h4>
                            <button
                              onClick={() => setShowFollowupForm(false)}
                              className="text-blue-400 hover:text-blue-600"
                            >
                              <span className="material-symbols-outlined text-[16px]">
                                close
                              </span>
                            </button>
                          </div>
                          <input
                            type="text"
                            placeholder="Asunto (ej: Revisar cotización)"
                            value={followupData.title}
                            onChange={(e) =>
                              setFollowupData((prev) => ({
                                ...prev,
                                title: e.target.value,
                              }))
                            }
                            className="w-full text-[11px] border-blue-100 rounded-lg focus:ring-primary py-1.5"
                          />
                          <div className="grid grid-cols-2 gap-2">
                            <input
                              type="date"
                              value={followupData.date}
                              onChange={(e) =>
                                setFollowupData((prev) => ({
                                  ...prev,
                                  date: e.target.value,
                                }))
                              }
                              className="w-full text-[11px] border-blue-100 rounded-lg focus:ring-primary py-1.5"
                            />
                            <input
                              type="time"
                              value={followupData.time}
                              onChange={(e) =>
                                setFollowupData((prev) => ({
                                  ...prev,
                                  time: e.target.value,
                                }))
                              }
                              className="w-full text-[11px] border-blue-100 rounded-lg focus:ring-primary py-1.5"
                            />
                          </div>
                          <textarea
                            placeholder="Descripción adicional..."
                            value={followupData.description}
                            onChange={(e) =>
                              setFollowupData((prev) => ({
                                ...prev,
                                description: e.target.value,
                              }))
                            }
                            rows={2}
                            className="w-full text-[11px] border-blue-100 rounded-lg focus:ring-primary py-1.5"
                          />
                          <button
                            onClick={handleCreateGoogleCalendarEvent}
                            className="w-full bg-blue-600 text-white py-2 rounded-lg text-[10px] font-bold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                          >
                            <span className="material-symbols-outlined text-[18px]">
                              event
                            </span>
                            Sincronizar con Google Calendar
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Tareas del Cliente */}
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                      <div className="flex justify-between items-center mb-3">
                        <h4 className="text-xs font-bold text-slate-900 font-display uppercase tracking-widest">
                          Tareas Pendientes
                        </h4>
                        <button 
                          onClick={() => {
                            setIsEditingTask(false);
                            setTaskFormData({
                              title: "",
                              description: "",
                              due_date: new Date().toISOString().split('T')[0],
                              assigned_to: (selectedClient as any).assigned_to_name || "",
                              client_id: (selectedClient as any).id,
                              status: "Pendiente",
                            });
                            setIsTaskModalOpen(true);
                          }}
                          className="flex items-center gap-1 text-[10px] font-bold text-primary hover:text-blue-700 transition-colors"
                        >
                          <span className="material-symbols-outlined text-[14px]">add</span>
                          NUEVA
                        </button>
                      </div>

                      <div className="space-y-2">
                        {tasks.filter(t => t.client_id === (selectedClient as any).id && t.status === 'Pendiente').length === 0 ? (
                          <p className="text-[10px] text-slate-400 italic font-display">No hay tareas pendientes para este cliente.</p>
                        ) : (
                          tasks
                            .filter(t => t.client_id === (selectedClient as any).id && t.status === 'Pendiente')
                            .slice(0, 3)
                            .map(task => (
                              <div key={task.id} className="p-2 bg-white rounded-lg border border-slate-100 flex justify-between items-center group">
                                <div className="min-w-0">
                                  <p className="text-[11px] font-bold text-slate-700 truncate font-display">#{task.codigo?.toString().padStart(4, "0")} {task.title}</p>
                                  <p className="text-[9px] text-slate-400 font-display">Vence: {new Date(task.due_date).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' })}</p>
                                </div>
                                <button
                                  onClick={() => handleUpdateTaskStatus(task.id, 'Completada')}
                                  className="size-6 rounded-md hover:bg-emerald-50 text-slate-300 hover:text-emerald-500 transition-colors flex items-center justify-center"
                                  title="Marcar como completada"
                                >
                                  <span className="material-symbols-outlined text-[18px]">check_circle</span>
                                </button>
                              </div>
                            ))
                        )}
                        {tasks.filter(t => t.client_id === (selectedClient as any).id && t.status === 'Pendiente').length > 3 && (
                          <button 
                            onClick={() => {
                              setViewTab("Tareas");
                              setTaskSearchTerm((selectedClient as any).full_name || (selectedClient as any).company_name);
                            }}
                            className="w-full py-1 text-[10px] font-bold text-slate-400 hover:text-primary transition-colors text-center font-display"
                          >
                            Ver todas las tareas...
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h4 className="text-sm font-bold text-slate-900 font-display uppercase tracking-widest text-[11px] text-slate-400">
                        Línea de Tiempo
                      </h4>

                      {loadingInteractions ? (
                        <div className="p-8 text-center">
                          <div className="size-6 border-2 border-primary border-t-transparent animate-spin rounded-full mx-auto"></div>
                        </div>
                      ) : clientInteractions.length === 0 ? (
                        <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                          <span className="material-symbols-outlined text-slate-300 text-3xl mb-2">
                            history
                          </span>
                          <p className="text-xs text-slate-500 font-display">
                            Aún no hay registros de interacción.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-4 relative before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-px before:bg-slate-200">
                          {clientInteractions.map((item) => (
                            <div key={item.id} className="relative pl-8">
                              <div
                                className={`absolute left-0 top-1 size-6 rounded-full border-2 border-white shadow-sm flex items-center justify-center z-10 ${
                                  item.type === "Nota"
                                    ? "bg-amber-100 text-amber-600"
                                    : item.type === "Llamada"
                                      ? "bg-emerald-100 text-emerald-600"
                                      : item.type === "Reunión"
                                        ? "bg-purple-100 text-purple-600"
                                        : item.type === "Correo"
                                          ? "bg-blue-100 text-blue-600"
                                          : "bg-red-100 text-red-600"
                                }`}
                              >
                                <span className="material-symbols-outlined text-[14px]">
                                  {item.type === "Nota"
                                    ? "sticky_note"
                                    : item.type === "Llamada"
                                      ? "call"
                                      : item.type === "Reunión"
                                        ? "groups"
                                        : item.type === "Correo"
                                          ? "mail"
                                          : "support_agent"}
                                </span>
                              </div>
                              <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-sm">
                                <div className="flex justify-between items-center mb-1">
                                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-900">
                                    {item.type}
                                  </span>
                                  <span className="text-[10px] text-slate-400 font-medium">
                                    {new Date(item.created_at).toLocaleString(
                                      "es-CO",
                                      {
                                        day: "2-digit",
                                        month: "short",
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      },
                                    )}
                                  </span>
                                </div>
                                <p className="text-xs text-slate-700 font-display leading-relaxed">
                                  {item.content}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
              )}
            </div>
          </div>
              
              {/* Fixed "Add Order" button at the bottom of the sidebar */}
              <div className="border-t border-slate-100 p-8 pt-6">
                <button
                  onClick={() =>
                    router.push(
                      `/admin/pedidos?create=true&clientId=${selectedClient.id}`,
                    )
                  }
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary text-white rounded-xl text-sm font-bold hover:bg-blue-600 transition-all shadow-lg shadow-primary/25 font-display"
                >
                  <span className="material-symbols-outlined text-[20px]">
                    add_shopping_cart
                  </span>
                  Nuevo Pedido
                </button>
              </div>
            </div>
            );
          }
        } else {
          if (!selectedTask) {
              return (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-white">
                  <span className="material-symbols-outlined text-5xl text-slate-200 mb-4">
                    task
                  </span>
                  <p className="text-slate-500 font-display">
                    Selecciona una tarea para ver sus detalles.
                  </p>
                </div>
                  );
                } else {
                  return (
                <div className="flex flex-col h-full bg-white relative">
                  {/* Botón de Cierre */}
                  <button 
                    onClick={() => setSelectedTaskId(null)}
                    className="absolute top-6 right-6 size-10 flex items-center justify-center text-slate-400 hover:text-red-500 transition-all z-20"
                    title="Cerrar detalles"
                  >
                    <span className="material-symbols-outlined text-[28px]">close</span>
                  </button>

                  <div className="p-8 pb-4 flex-1 overflow-y-auto">
                    <div className="flex justify-between items-start mb-6 pr-8">
                      <div className="text-xs font-bold uppercase tracking-wider text-slate-400 font-display">
                        Detalles de la Tarea
                      </div>
                      <div className="inline-flex items-center justify-center px-2 py-1 rounded bg-slate-100 text-slate-600 text-[10px] font-bold font-mono border border-slate-200 shadow-sm">
                        #{selectedTask.codigo?.toString().padStart(4, "0")}
                      </div>
                    </div>

                    <h3 className="text-xl font-bold text-slate-900 font-display mb-2">
                      {selectedTask.title}
                    </h3>
                    
                    <div className="flex flex-wrap gap-2 mb-6">
                      <div className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full border font-display ${
                          selectedTask.status === 'Pendiente' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                          selectedTask.status === 'Completada' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                          'bg-slate-50 text-slate-700 border-slate-200'
                        }`}
                      >
                        {selectedTask.status}
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div>
                        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                          <span className="material-symbols-outlined text-sm">description</span>
                          Descripción
                        </h4>
                        <p className="text-sm text-slate-600 font-display leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100 italic">
                          {selectedTask.description || "Sin descripción proporcionada."}
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                          <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-2">
                            <span className="material-symbols-outlined text-sm">event</span>
                            Vencimiento
                          </h4>
                          <p className="text-sm font-bold text-slate-700 font-display">
                            {new Date(selectedTask.due_date).toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'UTC' })}
                          </p>
                        </div>
                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                          <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-2">
                            <span className="material-symbols-outlined text-sm">person</span>
                            Asignado a
                          </h4>
                          <p className="text-sm font-bold text-slate-700 font-display">
                            {selectedTask.assigned_to || "No asignado"}
                          </p>
                        </div>
                      </div>

                      {selectedTask.client && (
                        <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-100/50 group hover:bg-blue-50 transition-all cursor-pointer"
                          onClick={() => {
                            if (selectedTask.client_id) {
                              setSelectedClientId(selectedTask.client_id);
                              setViewTab('Clientes');
                            }
                          }}
                        >
                          <h4 className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                            <span className="material-symbols-outlined text-sm">contact_page</span>
                            Cliente Relacionado
                          </h4>
                          <div className="flex items-center gap-3">
                            <div className="size-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform">
                               <span className="material-symbols-outlined text-lg">person</span>
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-bold text-slate-900 font-display">
                                {selectedTask.client.full_name || selectedTask.client.company_name}
                              </p>
                              <p className="text-[10px] text-blue-500 font-semibold font-display">Ver perfil detallado del cliente →</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="p-8 pt-4 border-t border-slate-100 bg-white mt-auto">
                     <div className="flex gap-3">
                        <button 
                           onClick={() => {
                              setEditingTaskId(selectedTask.id);
                              setIsEditingTask(true);
                              setTaskFormData({
                                title: selectedTask.title,
                                description: selectedTask.description || "",
                                due_date: selectedTask.due_date.split('T')[0],
                                assigned_to: selectedTask.assigned_to || "",
                                client_id: selectedTask.client_id || "",
                                status: selectedTask.status,
                              });
                              setIsTaskModalOpen(true);
                           }}
                           className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-white border border-slate-200 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-50 hover:border-slate-300 transition-all font-display"
                        >
                          <span className="material-symbols-outlined text-[20px]">edit</span>
                          Editar
                        </button>
                        <button 
                           onClick={(e) => {
                             e.stopPropagation();
                             handleDeleteTask(selectedTask.id);
                           }}
                           className="flex items-center justify-center size-[48px] bg-red-50 text-red-500 border border-red-100 rounded-xl hover:bg-red-500 hover:text-white transition-all shadow-sm"
                           title="Eliminar tarea"
                        >
                          <span className="material-symbols-outlined text-[20px]">delete</span>
                        </button>
                     </div>
                  </div>
              </div>
              );
            }
          }
        })()}
          </div>
        </aside>
      </div>

      {/* MODAL NUEVO CLIENTE */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-300">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div>
                <h2 className="text-xl font-bold text-slate-900 font-display">
                  {isEditMode ? "Editar Cliente" : "Nuevo Cliente"}
                </h2>
                <p className="text-xs text-slate-500 font-medium font-display">
                  {isEditMode
                    ? "Actualiza la información del perfil."
                    : "Registra un nuevo perfil en la base de datos."}
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="size-8 rounded-full border border-slate-200 bg-white flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">
                  close
                </span>
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              className="flex-1 overflow-y-auto p-8 space-y-8"
            >
              {/* Selector de Tipo */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex items-center justify-center gap-10">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="radio"
                    name="clientType"
                    checked={clientType === "Natural"}
                    onChange={() => setClientType("Natural")}
                    className="size-5 text-primary focus:ring-primary border-slate-300"
                  />
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-slate-900 font-display group-hover:text-primary transition-colors">
                      Persona Natural
                    </span>
                    <span className="text-[10px] text-slate-500 font-medium font-display uppercase tracking-widest">
                      Particular
                    </span>
                  </div>
                </label>
                <div className="w-px h-8 bg-slate-200"></div>
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="radio"
                    name="clientType"
                    checked={clientType === "Empresa"}
                    onChange={() => setClientType("Empresa")}
                    className="size-5 text-primary focus:ring-primary border-slate-300"
                  />
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-slate-900 font-display group-hover:text-primary transition-colors">
                      Empresa
                    </span>
                    <span className="text-[10px] text-slate-500 font-medium font-display uppercase tracking-widest">
                      Corporativo
                    </span>
                  </div>
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* PERSONA NATURAL FIELDS */}
                {clientType === "Natural" ? (
                  <>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 font-display">
                        Nombre Completo <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="full_name"
                        value={formData.full_name}
                        onChange={handleInputChange}
                        required
                        className="block w-full rounded-lg border-slate-200 px-4 py-3 bg-white text-slate-900 shadow-sm focus:border-primary focus:ring-primary font-display font-medium"
                        placeholder="Juan Alberto Pérez..."
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 font-display">
                        Tipo de Documento <span className="text-red-500">*</span>
                      </label>
                      <select
                        name="document_type"
                        value={formData.document_type}
                        onChange={handleInputChange}
                        required
                        className="block w-full rounded-lg border-slate-200 px-4 py-3 bg-white text-slate-900 shadow-sm focus:border-primary focus:ring-primary font-display font-medium"
                      >
                        <option value="C.C">Cédula de Ciudadanía (C.C)</option>
                        <option value="C.E">Cédula de Extranjería (C.E)</option>
                        <option value="T.I">Tarjeta de Identidad (T.I)</option>
                        <option value="Pasaporte">Pasaporte</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 font-display">
                        Número de Documento <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="document_number"
                        value={formData.document_number}
                        onChange={handleInputChange}
                        required
                        className="block w-full rounded-lg border-slate-200 px-4 py-3 bg-white text-slate-900 shadow-sm focus:border-primary focus:ring-primary font-display font-medium"
                        placeholder="1.032.456..."
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 font-display">
                        Número de Contacto <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                        required
                        className="block w-full rounded-lg border-slate-200 px-4 py-3 bg-white text-slate-900 shadow-sm focus:border-primary focus:ring-primary font-display font-medium"
                        placeholder="+57 321..."
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 font-display">
                        Correo Electrónico <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        required
                        className="block w-full rounded-lg border-slate-200 px-4 py-3 bg-white text-slate-900 shadow-sm focus:border-primary focus:ring-primary font-display font-medium"
                        placeholder="cliente@correo.com"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 font-display">
                        Departamento <span className="text-red-500">*</span>
                      </label>
                      <select
                        name="department"
                        value={formData.department}
                        onChange={handleInputChange}
                        required
                        className="block w-full rounded-lg border-slate-200 px-4 py-3 bg-white text-slate-900 shadow-sm focus:border-primary focus:ring-primary font-display font-medium"
                      >
                        <option value="">Seleccionar...</option>
                        {departments.map((dept) => (
                          <option key={dept} value={dept}>{dept}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 font-display">
                        Municipio <span className="text-red-500">*</span>
                      </label>
                      <select
                        name="municipality"
                        value={formData.municipality}
                        onChange={handleInputChange}
                        required
                        className="block w-full rounded-lg border-slate-200 px-4 py-3 bg-white text-slate-900 shadow-sm focus:border-primary focus:ring-primary font-display font-medium"
                        disabled={!formData.department}
                      >
                        <option value="">Seleccionar...</option>
                        {formData.department && colombiaData[formData.department]?.map((mun) => (
                          <option key={mun} value={mun}>{mun}</option>
                        ))}
                      </select>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 font-display">
                        Dirección de Residencia <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="address"
                        value={formData.address}
                        onChange={handleInputChange}
                        required
                        className="block w-full rounded-lg border-slate-200 px-4 py-3 bg-white text-slate-900 shadow-sm focus:border-primary focus:ring-primary font-display font-medium"
                        placeholder="Calle 123 #45-67..."
                      />
                    </div>
                    <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 font-display">
                          Sector / Industria <span className="text-red-500">*</span>
                        </label>
                        <select
                          name="industry_sector"
                          value={formData.industry_sector}
                          onChange={handleInputChange}
                          required
                          className="block w-full rounded-lg border-slate-200 px-4 py-3 bg-white text-slate-900 shadow-sm focus:border-primary focus:ring-primary font-display font-medium"
                        >
                          <option value="">Seleccionar...</option>
                          {CLIENT_SECTORS.map((sector) => (
                            <option key={sector} value={sector}>{sector}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 font-display">
                          Procedencia <span className="text-red-500">*</span>
                        </label>
                        <select
                          name="source_type"
                          value={formData.source_type}
                          onChange={(e) => {
                            const val = e.target.value;
                            setFormData(prev => ({ ...prev, source_type: val, source_sub_type: '', source: val }));
                          }}
                          required
                          className="block w-full rounded-lg border-slate-200 px-4 py-3 bg-white text-slate-900 shadow-sm focus:border-primary focus:ring-primary font-display font-medium"
                        >
                          <option value="Nuevo">Nuevo</option>
                          <option value="Redes sociales">Redes sociales</option>
                          <option value="Gestion marketing">Gestión marketing</option>
                          <option value="Referido por cliente">Referido por cliente</option>
                          <option value="Referido por marca">Referido por marca</option>
                          <option value="Mercado Libre">Mercado Libre</option>
                          <option value="Otro">Otro</option>
                        </select>
                      </div>
                    </div>

                    {/* Procedencia Condicional (Natural) */}
                    {(formData.source_type === 'Redes sociales' || formData.source_type === 'Gestion marketing' || formData.source_type === 'Referido por cliente' || formData.source_type === 'Referido por marca' || formData.source_type === 'Otro') && (
                      <div className="md:col-span-2 animate-in fade-in slide-in-from-top-2 duration-300">
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 font-display">
                          {formData.source_type === 'Redes sociales' ? 'Seleccionar Red Social' : 
                           formData.source_type === 'Gestion marketing' ? 'Seleccionar Gestión' :
                           formData.source_type === 'Referido por cliente' ? '¿Quién lo refirió?' :
                           formData.source_type === 'Referido por marca' ? 'Seleccionar Marca' :
                           'Especifique Procedencia'} <span className="text-red-500">*</span>
                        </label>
                        {formData.source_type === 'Redes sociales' ? (
                          <select 
                            name="source_sub_type" 
                            value={formData.source_sub_type} 
                            onChange={handleInputChange} 
                            required
                            className="block w-full rounded-lg border-slate-200 px-4 py-3 bg-white text-slate-900 shadow-sm focus:border-primary focus:ring-primary font-display font-medium"
                          >
                            <option value="">Seleccionar...</option>
                            <option value="Facebook">Facebook</option>
                            <option value="Instagram">Instagram</option>
                            <option value="Tiktok">Tiktok</option>
                            <option value="X">X (Twitter)</option>
                            <option value="LinkedIn">LinkedIn</option>
                          </select>
                        ) : formData.source_type === 'Gestion marketing' ? (
                          <select 
                            name="source_sub_type" 
                            value={formData.source_sub_type} 
                            onChange={handleInputChange} 
                            required
                            className="block w-full rounded-lg border-slate-200 px-4 py-3 bg-white text-slate-900 shadow-sm focus:border-primary focus:ring-primary font-display font-medium"
                          >
                            <option value="">Seleccionar...</option>
                            <option value="Bases de datos">Bases de datos</option>
                            <option value="Correos masivos">Correos masivos</option>
                          </select>
                        ) : formData.source_type === 'Referido por marca' ? (
                          <select 
                            name="referred_by_brand_id" 
                            value={formData.referred_by_brand_id} 
                            onChange={handleInputChange} 
                            required
                            className="block w-full rounded-lg border-slate-200 px-4 py-3 bg-white text-slate-900 shadow-sm focus:border-primary focus:ring-primary font-display font-medium"
                          >
                            <option value={0}>Seleccionar Marca...</option>
                            {brands.map((brand) => (
                              <option key={brand.id} value={brand.id}>{brand.name}</option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type="text"
                            name="source_sub_type"
                            value={formData.source_sub_type}
                            onChange={handleInputChange}
                            required
                            className="block w-full rounded-lg border-slate-200 px-4 py-3 bg-white text-slate-900 shadow-sm focus:border-primary focus:ring-primary font-display font-medium"
                            placeholder={formData.source_type === 'Referido por cliente' ? 'Nombre del cliente...' : 'Escriba aquí...'}
                          />
                        )}
                      </div>
                    )}
                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 font-display">
                        Notas
                      </label>
                      <textarea
                        name="notes"
                        value={formData.notes}
                        onChange={handleInputChange}
                        rows={3}
                        className="block w-full rounded-lg border-slate-200 px-4 py-3 bg-white text-slate-900 shadow-sm focus:border-primary focus:ring-primary font-display font-medium"
                        placeholder="Información adicional relevante..."
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 font-display">
                        Foto del Cliente
                      </label>
                      <div className="relative aspect-video rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden group hover:border-primary transition-colors cursor-pointer">
                        {imagePreview ? (
                          <>
                            <Image src={imagePreview} alt="Preview" fill className="object-cover" />
                            <button type="button" onClick={() => {setImageFile(null); setImagePreview(null);}} className="absolute top-2 right-2 size-8 bg-white/90 rounded-full flex items-center justify-center text-red-500 shadow-lg hover:bg-white">
                              <span className="material-symbols-outlined text-[20px]">delete</span>
                            </button>
                          </>
                        ) : (
                          <label className="cursor-pointer flex flex-col items-center p-8 text-center w-full h-full justify-center">
                            <span className="material-symbols-outlined text-4xl text-slate-300 mb-2">add_a_photo</span>
                            <span className="text-xs font-bold text-primary font-display">SUBIR FOTO</span>
                            <input type="file" className="sr-only" onChange={handleImageChange} accept="image/*" />
                          </label>
                        )}
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    {/* CORPORATE (EMPRESA) FIELDS */}
                    <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 font-display">Nombre de la Empresa <span className="text-red-500">*</span></label>
                        <input type="text" name="full_name" value={formData.full_name} onChange={handleInputChange} required className="block w-full rounded-lg border-slate-200 px-4 py-3 bg-white text-slate-900 shadow-sm focus:border-primary focus:ring-primary font-display font-medium" placeholder="Ej: Soluciones Tech S.A.S" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 font-display">NIT</label>
                        <input type="text" name="document_number" value={formData.document_number} onChange={handleInputChange} className="block w-full rounded-lg border-slate-200 px-4 py-3 bg-white text-slate-900 shadow-sm focus:border-primary focus:ring-primary font-display font-medium" placeholder="900.123.456-1" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 font-display">Contacto <span className="text-red-500">*</span></label>
                        <input type="text" name="contact_person" value={formData.contact_person} onChange={handleInputChange} required className="block w-full rounded-lg border-slate-200 px-4 py-3 bg-white text-slate-900 shadow-sm focus:border-primary focus:ring-primary font-display font-medium" placeholder="Nombre del representante..." />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 font-display">Cargo <span className="text-red-500">*</span></label>
                        <input type="text" name="position" value={formData.position} onChange={handleInputChange} required className="block w-full rounded-lg border-slate-200 px-4 py-3 bg-white text-slate-900 shadow-sm focus:border-primary focus:ring-primary font-display font-medium" placeholder="Cargo del contacto..." />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 font-display">Número de Contacto <span className="text-red-500">*</span></label>
                        <input type="tel" name="phone" value={formData.phone} onChange={handleInputChange} required className="block w-full rounded-lg border-slate-200 px-4 py-3 bg-white text-slate-900 shadow-sm focus:border-primary focus:ring-primary font-display font-medium" placeholder="+57 321..." />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 font-display">Número de WhatsApp <span className="text-red-500">*</span></label>
                        <input type="tel" name="whatsapp" value={formData.whatsapp} onChange={handleInputChange} required className="block w-full rounded-lg border-slate-200 px-4 py-3 bg-white text-slate-900 shadow-sm focus:border-primary focus:ring-primary font-display font-medium" placeholder="+57 321..." />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 font-display">Correo Electrónico <span className="text-red-500">*</span></label>
                        <input type="email" name="email" value={formData.email} onChange={handleInputChange} required className="block w-full rounded-lg border-slate-200 px-4 py-3 bg-white text-slate-900 shadow-sm focus:border-primary focus:ring-primary font-display font-medium" placeholder="cliente@correo.com" />
                    </div>
                    
                    <div>
                       <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 font-display">Departamento <span className="text-red-500">*</span></label>
                       <select name="department" value={formData.department} onChange={handleInputChange} required className="block w-full rounded-lg border-slate-200 px-4 py-3 bg-white text-slate-900 shadow-sm focus:border-primary focus:ring-primary font-display font-medium">
                         <option value="">Seleccionar...</option>
                         {departments.map(dept => (
                           <option key={dept} value={dept}>{dept}</option>
                         ))}
                       </select>
                    </div>

                    <div>
                       <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 font-display">Municipio <span className="text-red-500">*</span></label>
                       <select name="municipality" value={formData.municipality} onChange={handleInputChange} required className="block w-full rounded-lg border-slate-200 px-4 py-3 bg-white text-slate-900 shadow-sm focus:border-primary focus:ring-primary font-display font-medium" disabled={!formData.department}>
                         <option value="">Seleccionar...</option>
                         {formData.department && colombiaData[formData.department]?.map(mun => (
                           <option key={mun} value={mun}>{mun}</option>
                         ))}
                       </select>
                    </div>

                    <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 font-display">Dirección</label>
                        <input type="text" name="address" value={formData.address} onChange={handleInputChange} className="block w-full rounded-lg border-slate-200 px-4 py-3 bg-white text-slate-900 shadow-sm focus:border-primary focus:ring-primary font-display font-medium" placeholder="Calle 123 #45-67..." />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 font-display">Sector Industria <span className="text-red-500">*</span></label>
                        <select name="industry_sector" value={formData.industry_sector} onChange={handleInputChange} required className="block w-full rounded-lg border-slate-200 px-4 py-3 bg-white text-slate-900 shadow-sm focus:border-primary focus:ring-primary font-display font-medium">
                            <option value="">Seleccionar...</option>
                            {CLIENT_SECTORS.map(sector => (
                                <option key={sector} value={sector}>{sector}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 font-display">Procedencia <span className="text-red-500">*</span></label>
                        <select 
                          name="source_type" 
                          value={formData.source_type} 
                          onChange={(e) => {
                            const val = e.target.value;
                            setFormData(prev => ({ ...prev, source_type: val, source_sub_type: '', source: val }));
                          }} 
                          required 
                          className="block w-full rounded-lg border-slate-200 px-4 py-3 bg-white text-slate-900 shadow-sm focus:border-primary focus:ring-primary font-display font-medium"
                        >
                            <option value="Nuevo">Nuevo</option>
                            <option value="Redes sociales">Redes sociales</option>
                            <option value="Gestion marketing">Gestión marketing</option>
                            <option value="Referido por cliente">Referido por cliente</option>
                            <option value="Referido por marca">Referido por marca</option>
                            <option value="Mercado Libre">Mercado Libre</option>
                            <option value="Otro">Otro</option>
                        </select>
                    </div>

                    {/* Procedencia Condicional (Empresa) */}
                    {(formData.source_type === 'Redes sociales' || formData.source_type === 'Gestion marketing' || formData.source_type === 'Referido por cliente' || formData.source_type === 'Referido por marca' || formData.source_type === 'Otro') && (
                      <div className="md:col-span-2 animate-in fade-in slide-in-from-top-2 duration-300">
                         <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 font-display">
                           {formData.source_type === 'Redes sociales' ? 'Seleccionar Red Social' : 
                            formData.source_type === 'Gestion marketing' ? 'Seleccionar Gestión' :
                            formData.source_type === 'Referido por cliente' ? '¿Quién lo refirió?' :
                            formData.source_type === 'Referido por marca' ? 'Seleccionar Marca' :
                            'Especifique Procedencia'} <span className="text-red-500">*</span>
                         </label>
                         {formData.source_type === 'Redes sociales' ? (
                           <select 
                             name="source_sub_type" 
                             value={formData.source_sub_type} 
                             onChange={handleInputChange} 
                             required
                             className="block w-full rounded-lg border-slate-200 px-4 py-3 bg-white text-slate-900 shadow-sm focus:border-primary focus:ring-primary font-display font-medium"
                           >
                             <option value="">Seleccionar...</option>
                             <option value="Facebook">Facebook</option>
                             <option value="Instagram">Instagram</option>
                             <option value="Tiktok">Tiktok</option>
                             <option value="X">X (Twitter)</option>
                             <option value="LinkedIn">LinkedIn</option>
                           </select>
                         ) : formData.source_type === 'Gestion marketing' ? (
                           <select 
                             name="source_sub_type" 
                             value={formData.source_sub_type} 
                             onChange={handleInputChange} 
                             required
                             className="block w-full rounded-lg border-slate-200 px-4 py-3 bg-white text-slate-900 shadow-sm focus:border-primary focus:ring-primary font-display font-medium"
                           >
                             <option value="">Seleccionar...</option>
                             <option value="Bases de datos">Bases de datos</option>
                             <option value="Correos masivos">Correos masivos</option>
                           </select>
                         ) : formData.source_type === 'Referido por marca' ? (
                           <select 
                             name="referred_by_brand_id" 
                             value={formData.referred_by_brand_id} 
                             onChange={handleInputChange} 
                             required
                             className="block w-full rounded-lg border-slate-200 px-4 py-3 bg-white text-slate-900 shadow-sm focus:border-primary focus:ring-primary font-display font-medium"
                           >
                             <option value={0}>Seleccionar Marca...</option>
                             {brands.map((brand) => (
                               <option key={brand.id} value={brand.id}>{brand.name}</option>
                             ))}
                           </select>
                         ) : (
                           <input
                             type="text"
                             name="source_sub_type"
                             value={formData.source_sub_type}
                             onChange={handleInputChange}
                             required
                             className="block w-full rounded-lg border-slate-200 px-4 py-3 bg-white text-slate-900 shadow-sm focus:border-primary focus:ring-primary font-display font-medium"
                             placeholder={formData.source_type === 'Referido por cliente' ? 'Nombre del cliente...' : 'Escriba aquí...'}
                           />
                         )}
                      </div>
                    )}

                    <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 font-display">Ejecutivo comercial asignado <span className="text-red-500">*</span></label>
                        <select name="assigned_to_name" value={formData.assigned_to_name} onChange={handleInputChange} required className="block w-full rounded-lg border-slate-200 px-4 py-3 bg-white text-slate-900 shadow-sm focus:border-primary focus:ring-primary font-display font-medium">
                            <option value="">Seleccionar...</option>
                            <option value="Asesor 1">Asesor 1</option>
                            <option value="Asesor 2">Asesor 2</option>
                        </select>
                    </div>

                    <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 font-display">Requerimientos</label>
                        <textarea name="notes" value={formData.notes} onChange={handleInputChange} rows={3} className="block w-full rounded-lg border-slate-200 px-4 py-3 bg-white text-slate-900 shadow-sm focus:border-primary focus:ring-primary font-display font-medium" placeholder="Describa los requerimientos del cliente..." />
                    </div>
                  </>
                )}
              </div>

              <div className="pt-4 flex justify-end gap-4 border-t border-slate-100 pt-8">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-8 py-3 rounded-xl border border-slate-300 text-slate-600 font-bold text-sm bg-white hover:bg-slate-50 transition-all font-display"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-primary hover:bg-blue-600 text-white px-10 py-3 rounded-xl font-bold shadow-lg shadow-primary/20 transition-all text-sm font-display disabled:opacity-50 flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <div className="size-4 border-2 border-white border-t-transparent animate-spin rounded-full"></div>
                      <span>Guardando...</span>
                    </>
                  ) : (
                    <span>Registrar Cliente</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL CONFIRMACIÓN ELIMINACIÓN */}
      {isDeleteModalOpen && selectedClient && (
        <div className="fixed inset-0 bg-slate-900/60 z-[60] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in duration-300">
            <div className="p-6 text-center">
              <div className="size-16 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
                <span className="material-symbols-outlined text-red-600 text-[32px]">
                  delete_forever
                </span>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2 font-display">
                ¿Eliminar cliente?
              </h3>
              <p className="text-slate-500 text-sm font-display mb-6">
                Estás a punto de eliminar a{" "}
                <span className="font-bold text-slate-700">
                  {selectedClient.full_name}
                </span>
                . Esta acción es permanente y no se puede deshacer.
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="flex-1 px-4 py-3 bg-slate-100 text-slate-700 rounded-xl text-sm font-bold hover:bg-slate-200 transition-colors font-display"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDeleteClient}
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-3 bg-red-600 text-white rounded-xl text-sm font-bold hover:bg-red-700 transition-colors shadow-lg shadow-red-200 font-display disabled:opacity-50"
                >
                  {isSubmitting ? "Eliminando..." : "Confirmar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Informe */}
      {isReportModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined text-[24px]">
                    analytics
                  </span>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 font-display">
                    Generar Informe
                  </h3>
                  <p className="text-xs text-slate-500 font-display">
                    Selecciona el rango de fechas para el reporte
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsReportModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
                disabled={isGeneratingReport}
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">
                    Fecha Desde
                  </label>
                  <input
                    type="date"
                    value={reportStartDate}
                    onChange={(e) => setReportStartDate(e.target.value)}
                    disabled={isGeneratingReport}
                    className="w-full text-sm border-slate-200 rounded-xl focus:ring-primary focus:border-primary transition-all p-2.5"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">
                    Fecha Hasta
                  </label>
                  <input
                    type="date"
                    value={reportEndDate}
                    onChange={(e) => setReportEndDate(e.target.value)}
                    disabled={isGeneratingReport}
                    className="w-full text-sm border-slate-200 rounded-xl focus:ring-primary focus:border-primary transition-all p-2.5"
                  />
                </div>
              </div>

              <div className="p-4 bg-primary/5 rounded-xl border border-primary/10">
                <p className="text-[11px] text-primary font-medium leading-relaxed">
                  <span className="font-bold">Nota:</span> El informe incluirá los clientes creados en este rango, sus pedidos registrados y su línea de tiempo completa hasta la fecha.
                </p>
              </div>
            </div>

            <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-3">
              <button
                onClick={() => setIsReportModalOpen(false)}
                className="flex-1 px-4 py-2.5 text-slate-600 font-bold text-sm hover:bg-slate-100 rounded-xl transition-all"
                disabled={isGeneratingReport}
              >
                Cancelar
              </button>
              <button
                onClick={handleGenerateReport}
                disabled={isGeneratingReport}
                className="flex-1 px-4 py-2.5 bg-primary text-white font-bold text-sm rounded-xl hover:bg-blue-600 transition-all shadow-md shadow-primary/20 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isGeneratingReport ? (
                  <>
                    <div className="size-4 border-2 border-white/30 border-t-white animate-spin rounded-full"></div>
                    Generando...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[18px]">
                      download
                    </span>
                    Descargar XLSX
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Modal de Tareas CRM */}
      {isTaskModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-xl bg-orange-100 flex items-center justify-center text-orange-600">
                  <span className="material-symbols-outlined text-[24px]">
                    {isEditingTask ? 'edit_note' : 'add_task'}
                  </span>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 font-display">
                    {isEditingTask ? "Editar Tarea" : "Nueva Tarea CRM"}
                  </h3>
                  <p className="text-xs text-slate-500 font-display">
                    {isEditingTask ? "Modifica los detalles de la tarea" : "Asigna una nueva tarea al equipo"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsTaskModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
                disabled={isSubmitting}
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="p-6 space-y-5">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">
                  Título de la Tarea <span className="text-red-500">*</span>
                </label>
                <input
                  required
                  type="text"
                  value={taskFormData.title}
                  onChange={(e) => setTaskFormData({ ...taskFormData, title: e.target.value })}
                  placeholder="Ej: Seguimiento de propuesta comercial"
                  className="w-full text-sm border-slate-200 rounded-xl focus:ring-primary focus:border-primary transition-all p-2.5"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">
                  Descripción
                </label>
                <textarea
                  rows={3}
                  value={taskFormData.description}
                  onChange={(e) => setTaskFormData({ ...taskFormData, description: e.target.value })}
                  placeholder="Añade detalles adicionales..."
                  className="w-full text-sm border-slate-200 rounded-xl focus:ring-primary focus:border-primary transition-all p-2.5 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">
                    Fecha de Vencimiento <span className="text-red-500">*</span>
                  </label>
                  <input
                    required
                    type="date"
                    value={taskFormData.due_date}
                    onChange={(e) => setTaskFormData({ ...taskFormData, due_date: e.target.value })}
                    className="w-full text-sm border-slate-200 rounded-xl focus:ring-primary focus:border-primary transition-all p-2.5"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">
                    Asesor Asignado
                  </label>
                  <input
                    type="text"
                    value={taskFormData.assigned_to}
                    onChange={(e) => setTaskFormData({ ...taskFormData, assigned_to: e.target.value })}
                    placeholder="Nombre del asesor"
                    className="w-full text-sm border-slate-200 rounded-xl focus:ring-primary focus:border-primary transition-all p-2.5"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">
                    Cliente Relacionado (Opcional)
                  </label>
                  <select
                    value={taskFormData.client_id}
                    onChange={(e) => setTaskFormData({ ...taskFormData, client_id: e.target.value })}
                    className="w-full text-sm border-slate-200 rounded-xl focus:ring-primary focus:border-primary transition-all p-2.5"
                  >
                    <option value="">Ninguno</option>
                    {clients.map(client => (
                      <option key={client.id} value={client.id}>
                        {client.full_name || client.company_name}
                      </option>
                    ))}
                  </select>
                </div>
                {isEditingTask && (
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">
                      Estado de la Tarea
                    </label>
                    <select
                      value={taskFormData.status}
                      onChange={(e) => setTaskFormData({ ...taskFormData, status: e.target.value as Task["status"] })}
                      className="w-full text-sm border-slate-200 rounded-xl focus:ring-primary focus:border-primary transition-all p-2.5"
                    >
                      <option value="Pendiente">Pendiente</option>
                      <option value="Completada">Completada</option>
                      <option value="Cancelada">Cancelada</option>
                    </select>
                  </div>
                )}
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsTaskModalOpen(false)}
                  className="flex-1 px-4 py-2.5 text-slate-600 font-bold text-sm hover:bg-slate-100 rounded-xl transition-all"
                  disabled={isSubmitting}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2.5 bg-primary text-white font-bold text-sm rounded-xl hover:bg-blue-600 transition-all shadow-md shadow-primary/20 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <div className="size-4 border-2 border-white/30 border-t-white animate-spin rounded-full"></div>
                      Guardando...
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[18px]">
                        save
                      </span>
                      {isEditingTask ? "Actualizar Tarea" : "Crear Tarea"}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminClientsPage;
