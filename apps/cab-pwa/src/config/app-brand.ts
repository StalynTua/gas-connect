/**
 * Configuración centralizada de marca e identidad comercial para cab-pwa.
 * Permite cambiar la denominación comercial, subtítulos operativos y canales de contacto
 * en un único punto del sistema sin tener que editar múltiples componentes ni vistas.
 */
export const APP_BRAND = {
  /** Nombre completo de la aplicación */
  appName: 'GasConnect Cabina Ibarra',

  /** Título principal mostrado en la cabecera */
  brandTitle: 'GasConnect Cabina',

  /** Subtítulo operativo contextual */
  brandSubtitle: 'IBARRA · ACCESO DE UNIDAD',

  /** Leyenda informativa para personal de reparto */
  helperDisclaimer: 'Uso exclusivo para ayudantes de distribución de gas GLP.',

  /** Pregunta de soporte para recuperación de credenciales */
  forgotPrompt: '¿Olvidaste tu clave o cambiaste de camión?',

  /** Etiqueta de llamada a la acción para contactar a despacho */
  contactDispatcherLabel: 'Contactar al despachador de planta',

  /** URL de contacto (WhatsApp o tel:) configurable por entorno */
  contactUrl: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_DISPATCH_CONTACT_URL) || '',
} as const;
