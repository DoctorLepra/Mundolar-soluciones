const XLSX = require('xlsx');
const path = require('path');

const data = [
    ["Etapa / Mes", "Fecha (Quincena)", "Hito de Desarrollo / Entregable (Stakeholder)"],
    ["Etapa 1 (Mes 1)", "Marzo 26", "Inicio del proyecto. Setup base de framework y maquetación web."],
    ["Etapa 1 (Mes 1)", "Abril 15", "2-3 vistas estáticas terminadas para pre-revisión visual."],
    ["Etapa 1 (Mes 1)", "Abril 30", "ENTREGABLE 1: Todas las vistas de la web maquetadas (10% Frontend / Estático). Sin autenticación ni DB conectada."],
    ["Etapa 2 (Mes 2)", "Mayo 15", "Interfaz dinámica conectada a Base de Datos (Sistema de registro y login funcional)."],
    ["Etapa 2 (Mes 2)", "Mayo 31", "ENTREGABLE 2: Funciones de Auth operativas. Interfaz interactiva del Mapa de Stands maquetada y Prototipos de Dashboard UX Listos."],
    ["Etapa 3 (Mes 3)", "Junio 15", "Funciones administrativas de aprobación manual conectadas y operativas."],
    ["Etapa 3 (Mes 3)", "Junio 30", "ENTREGABLE 3: Módulo de Stands 100% Funcional (Reservas en base de datos, Prevención de colisiones Real-time)."],
    ["Etapa 4 (Mes 4)", "Julio 15", "CRM de deudas unificado y panel del administrador listo para métricas."],
    ["Etapa 4 (Mes 4)", "Julio 30", "ENTREGABLE FINAL: Embudos de email configurados (Resend), QA, Pase a Producción Definitivo (Entrega de Código)."]
];

const ws = XLSX.utils.aoa_to_sheet(data);

// Adjust column widths
ws['!cols'] = [
    { wch: 15 }, // Etapa
    { wch: 15 }, // Fecha
    { wch: 80 }  // Entregable
];

const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, "Entregables");

const outputPath = path.join(__dirname, 'Planilla_Entregables.xlsx');
XLSX.writeFile(wb, outputPath);
console.log("Excel file generated at:", outputPath);
