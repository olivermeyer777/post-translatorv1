
import { Language } from './types';

// Reordered according to specific request: PT, ZH, UK, EN, then others
export const SUPPORTED_LANGUAGES: Language[] = [
  { 
    code: 'pt', 
    name: 'Português', 
    flag: '🇵🇹', 
    geminiName: 'Portuguese', 
    greeting: 'Olá', 
    startCallText: 'Iniciar chamada de vídeo',
    kiosk: {
      title: 'Balcão de Vídeo Pessoal',
      services: ['Rastreamento', 'Mudança de endereço', 'Registo criminal', 'Reencaminhamento', 'Feedback'],
      buttonText: 'Começar aqui',
      footerText: 'As conversas são confidenciais e não são gravadas.'
    }
  },
  { 
    code: 'zh', 
    name: '中文', 
    flag: '🇨🇳', 
    geminiName: 'Mandarin Chinese', 
    greeting: 'Ni Hao', 
    startCallText: '开始视频通话',
    kiosk: {
      title: '个人视频柜台',
      services: ['邮件追踪', '更改地址', '无犯罪记录证明', '邮件转发', '客户反馈'],
      buttonText: '从这里开始',
      footerText: '通话内容保密，不作录音。'
    }
  },
  { 
    code: 'uk', 
    name: 'Українська', 
    flag: '🇺🇦', 
    geminiName: 'Ukrainian', 
    greeting: 'Dobriy den', 
    startCallText: 'Розпочати відеодзвінок',
    kiosk: {
      title: 'Персональна відео-стійка',
      services: ['Відстеження відправлень', 'Зміна адреси', 'Витяг про несудимість', 'Пересилання', 'Відгуки'],
      buttonText: 'Почати тут',
      footerText: 'Розмови є конфіденційними і не записуються.'
    }
  },
  { 
    code: 'en', 
    name: 'English', 
    flag: '🇬🇧', 
    geminiName: 'English', 
    greeting: 'Hello', 
    startCallText: 'Start Video Call',
    kiosk: {
      title: 'Personal Video Counter',
      services: ['Track Consignment', 'Change Address', 'Criminal Record Extract', 'Forwarding Orders', 'Customer Feedback'],
      buttonText: 'Start here',
      footerText: 'Conversations are treated confidentially and are not recorded.'
    }
  },
  { 
    code: 'de', 
    name: 'Deutsch', 
    flag: '🇩🇪', 
    geminiName: 'German', 
    greeting: 'Guten Tag', 
    startCallText: 'Video-Anruf starten',
    kiosk: {
      title: 'Persönlicher Video-Schalter',
      services: ['Sendungsverfolgung', 'Adressänderung', 'Strafregisterauszug', 'Nachsendung', 'Kundenfeedback'],
      buttonText: 'Hier starten',
      footerText: 'Gespräche werden vertraulich behandelt und nicht aufgezeichnet.'
    }
  },
  { 
    code: 'fr', 
    name: 'Français', 
    flag: '🇫🇷', 
    geminiName: 'French', 
    greeting: 'Bonjour', 
    startCallText: 'Démarrer l\'appel vidéo',
    kiosk: {
      title: 'Guichet Vidéo Personnel',
      services: ['Suivi des envois', 'Changement d\'adresse', 'Casier judiciaire', 'Réexpédition', 'Avis client'],
      buttonText: 'Commencer ici',
      footerText: 'Les conversations sont confidentielles et ne sont pas enregistrées.'
    }
  },
  { 
    code: 'it', 
    name: 'Italiano', 
    flag: '🇮🇹', 
    geminiName: 'Italian', 
    greeting: 'Buongiorno', 
    startCallText: 'Avvia videochiamata',
    kiosk: {
      title: 'Sportello Video Personale',
      services: ['Tracciamento invii', 'Cambio indirizzo', 'Casellario giudiziale', 'Rispedizione', 'Feedback clienti'],
      buttonText: 'Inizia qui',
      footerText: 'Le conversazioni sono trattate in modo confidenziale e non registrate.'
    }
  },
  { 
    code: 'es', 
    name: 'Español', 
    flag: '🇪🇸', 
    geminiName: 'Spanish', 
    greeting: 'Hola', 
    startCallText: 'Iniciar videollamada',
    kiosk: {
      title: 'Mostrador de Video Personal',
      services: ['Seguimiento de envíos', 'Cambio de dirección', 'Antecedentes penales', 'Reenvío', 'Comentarios'],
      buttonText: 'Empezar aquí',
      footerText: 'Las conversaciones son confidenciales y no se graban.'
    }
  },
  { 
    code: 'tr', 
    name: 'Türkçe', 
    flag: '🇹🇷', 
    geminiName: 'Turkish', 
    greeting: 'Merhaba', 
    startCallText: 'Görüntülü aramayı başlat',
    kiosk: {
      title: 'Kişisel Video Gişesi',
      services: ['Gönderi takibi', 'Adres değişikliği', 'Adli sicil kaydı', 'Yönlendirme', 'Müşteri görüşleri'],
      buttonText: 'Buradan başlayın',
      footerText: 'Görüşmeler gizli tutulur ve kaydedilmez.'
    }
  },
  { 
    code: 'ar', 
    name: 'العربية', 
    flag: '🇸🇦', 
    geminiName: 'Arabic', 
    greeting: 'As-salamu alaykum', 
    startCallText: 'ابدأ مكالمة فيديو',
    kiosk: {
      title: 'عداد الفيديو الشخصي',
      services: ['تتبع الشحنة', 'تغيير العنوان', 'السجل الجنائي', 'إعادة التوجيه', 'ملاحظات العملاء'],
      buttonText: 'ابدأ هنا',
      footerText: 'يتم التعامل مع المحادثات بسرية ولا يتم تسجيلها.'
    }
  }
];

export const DEFAULT_AGENT_LANGUAGE = SUPPORTED_LANGUAGES.find(l => l.code === 'en') || SUPPORTED_LANGUAGES[0]; 
export const DEFAULT_CUSTOMER_LANGUAGE = SUPPORTED_LANGUAGES.find(l => l.code === 'de') || SUPPORTED_LANGUAGES[0];

export const GEMINI_VOICES = ['Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr'];
