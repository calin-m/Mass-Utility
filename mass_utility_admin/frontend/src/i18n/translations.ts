export type Language = 'en' | 'ro' | 'de' | 'fr' | 'es';

export interface LanguageOption {
  code: Language;
  label: string;
  flag: string;
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'ro', label: 'Română', flag: '🇷🇴' },
  { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
];

export const TRANSLATIONS: Record<Language, Record<string, string>> = {
  en: {
    // Navigation / Header
    nav_licenses: 'License Registry',
    nav_companies: 'Companies',
    nav_clients: 'Clients',
    nav_audit_logs: 'Operations Audit',
    nav_settings: 'Settings',
    nav_package_tiers: 'Package Tiers',
    nav_security: 'System Status',

    // Common Buttons & Actions
    btn_save: 'Save Changes',
    btn_cancel: 'Cancel',
    btn_delete: 'Delete',
    btn_edit: 'Edit',
    btn_refresh: 'Refresh',
    btn_clear: 'Clear',
    btn_export_csv: 'Export CSV',
    btn_inspect: 'Inspect Log',
    btn_generate: 'Generate Key',
    btn_search: 'Search',

    // Settings Tab
    settings_title: 'Super Admin Portal Settings',
    settings_subtitle: 'Manage administrative security credentials, password access, and portal localization preferences.',
    settings_password_title: 'Change Administrator Password',
    settings_password_subtitle: 'Update primary authentication key for Super-Admin portal access.',
    settings_current_password: 'Current Password',
    settings_new_password: 'New Password (min. 8 characters)',
    settings_confirm_password: 'Confirm New Password',
    settings_update_password_btn: 'Update Admin Password',

    settings_lang_title: 'Portal Localization & Language',
    settings_lang_subtitle: 'Select preferred interface language for administrative UI tools and notifications.',
    settings_lang_label: 'Interface Language',

    // Table & Pagination
    page_size: 'Items per page',
    page_showing: 'Showing',
    page_of: 'of',
    page_previous: 'Previous',
    page_next: 'Next',
  },

  ro: {
    // Navigation / Header
    nav_licenses: 'Registru Licențe',
    nav_companies: 'Companii',
    nav_clients: 'Clienți',
    nav_audit_logs: 'Audit Operațiuni',
    nav_settings: 'Setări',
    nav_package_tiers: 'Pachete Licență',
    nav_security: 'Stare Sistem',

    // Common Buttons & Actions
    btn_save: 'Salvează Modificările',
    btn_cancel: 'Anulează',
    btn_delete: 'Șterge',
    btn_edit: 'Editează',
    btn_refresh: 'Reîmprospătează',
    btn_clear: 'Curăță',
    btn_export_csv: 'Exportă CSV',
    btn_inspect: 'Inspectează Jurnal',
    btn_generate: 'Generează Cheie',
    btn_search: 'Caută',

    // Settings Tab
    settings_title: 'Setări Portal Super Admin',
    settings_subtitle: 'Administrează credențialele de securitate, parola de acces și preferințele de localizare.',
    settings_password_title: 'Schimbare Parolă Administrator',
    settings_password_subtitle: 'Actualizează cheia principală de autentificare pentru portalul Super-Admin.',
    settings_current_password: 'Parola Curentă',
    settings_new_password: 'Parola Nouă (min. 8 caractere)',
    settings_confirm_password: 'Confirmă Parola Nouă',
    settings_update_password_btn: 'Actualizează Parola Admin',

    settings_lang_title: 'Localizare și Limba Portalului',
    settings_lang_subtitle: 'Selectează limba preferată pentru interfața de administrare și notificări.',
    settings_lang_label: 'Limba Interfeței',

    // Table & Pagination
    page_size: 'Elemente pe pagină',
    page_showing: 'Se afișează',
    page_of: 'din',
    page_previous: 'Înapoi',
    page_next: 'Înainte',
  },

  de: {
    // Navigation / Header
    nav_licenses: 'Lizenzregister',
    nav_companies: 'Unternehmen',
    nav_clients: 'Kunden',
    nav_audit_logs: 'Betriebsaudit',
    nav_settings: 'Einstellungen',
    nav_package_tiers: 'Paketstufen',
    nav_security: 'Systemstatus',

    // Common Buttons & Actions
    btn_save: 'Änderungen speichern',
    btn_cancel: 'Abbrechen',
    btn_delete: 'Löschen',
    btn_edit: 'Bearbeiten',
    btn_refresh: 'Aktualisieren',
    btn_clear: 'Löschen',
    btn_export_csv: 'CSV exportieren',
    btn_inspect: 'Protokoll prüfen',
    btn_generate: 'Schlüssel generieren',
    btn_search: 'Suchen',

    // Settings Tab
    settings_title: 'Super Admin Portaleinstellungen',
    settings_subtitle: 'Verwalten Sie Administrator-Anmeldedaten und Sprach-Einstellungen.',
    settings_password_title: 'Administrator-Passwort ändern',
    settings_password_subtitle: 'Hauptzugangsschlüssel für den Super-Admin-Portalzugriff aktualisieren.',
    settings_current_password: 'Aktuelles Passwort',
    settings_new_password: 'Neues Passwort (mind. 8 Zeichen)',
    settings_confirm_password: 'Neues Passwort bestätigen',
    settings_update_password_btn: 'Passwort aktualisieren',

    settings_lang_title: 'Portalsprache & Lokalisierung',
    settings_lang_subtitle: 'Wählen Sie die bevorzugte Schnittstellensprache für Admin-Tools.',
    settings_lang_label: 'Schnittstellensprache',

    // Table & Pagination
    page_size: 'Einträge pro Seite',
    page_showing: 'Angezeigt',
    page_of: 'von',
    page_previous: 'Zurück',
    page_next: 'Weiter',
  },

  fr: {
    // Navigation / Header
    nav_licenses: 'Registre des licences',
    nav_companies: 'Entreprises',
    nav_clients: 'Clients',
    nav_audit_logs: 'Audit des opérations',
    nav_settings: 'Paramètres',
    nav_package_tiers: 'Niveaux de forfait',
    nav_security: 'État du système',

    // Common Buttons & Actions
    btn_save: 'Enregistrer les modifications',
    btn_cancel: 'Annuler',
    btn_delete: 'Supprimer',
    btn_edit: 'Modifier',
    btn_refresh: 'Actualiser',
    btn_clear: 'Effacer',
    btn_export_csv: 'Exporter CSV',
    btn_inspect: 'Inspecter le journal',
    btn_generate: 'Générer une clé',
    btn_search: 'Rechercher',

    // Settings Tab
    settings_title: 'Paramètres du portail Super Admin',
    settings_subtitle: 'Gérez les identifiants de sécurité et la localisation du portail.',
    settings_password_title: 'Changer le mot de passe administrateur',
    settings_password_subtitle: 'Mettre à jour la clé d\'accès principale au portail.',
    settings_current_password: 'Mot de passe actuel',
    settings_new_password: 'Nouveau mot de passe (min. 8 caractères)',
    settings_confirm_password: 'Confirmer le nouveau mot de passe',
    settings_update_password_btn: 'Mettre à jour le mot de passe',

    settings_lang_title: 'Localisation & Langue du portail',
    settings_lang_subtitle: 'Sélectionnez la langue préférée pour l\'interface d\'administration.',
    settings_lang_label: 'Langue de l\'interface',

    // Table & Pagination
    page_size: 'Éléments par page',
    page_showing: 'Affichage de',
    page_of: 'sur',
    page_previous: 'Précédent',
    page_next: 'Suivant',
  },

  es: {
    // Navigation / Header
    nav_licenses: 'Registro de licencias',
    nav_companies: 'Empresas',
    nav_clients: 'Clientes',
    nav_audit_logs: 'Auditoría de operaciones',
    nav_settings: 'Configuración',
    nav_package_tiers: 'Niveles de paquetes',
    nav_security: 'Estado del sistema',

    // Common Buttons & Actions
    btn_save: 'Guardar cambios',
    btn_cancel: 'Cancelar',
    btn_delete: 'Eliminar',
    btn_edit: 'Editar',
    btn_refresh: 'Actualizar',
    btn_clear: 'Limpiar',
    btn_export_csv: 'Exportar CSV',
    btn_inspect: 'Inspeccionar registro',
    btn_generate: 'Generar clave',
    btn_search: 'Buscar',

    // Settings Tab
    settings_title: 'Configuración del portal Super Admin',
    settings_subtitle: 'Gestione credenciales de administración y la localización del portal.',
    settings_password_title: 'Cambiar contraseña de administrador',
    settings_password_subtitle: 'Actualizar la clave de acceso principal al portal.',
    settings_current_password: 'Contraseña actual',
    settings_new_password: 'Nueva contraseña (mín. 8 caracteres)',
    settings_confirm_password: 'Confirmar nueva contraseña',
    settings_update_password_btn: 'Actualizar contraseña',

    settings_lang_title: 'Localización e idioma del portal',
    settings_lang_subtitle: 'Seleccione el idioma preferido para la interfaz de administración.',
    settings_lang_label: 'Idioma de la interfaz',

    // Table & Pagination
    page_size: 'Elementos por página',
    page_showing: 'Mostrando',
    page_of: 'de',
    page_previous: 'Anterior',
    page_next: 'Siguiente',
  },
};
