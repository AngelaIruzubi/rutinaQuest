import { Colors } from './theme';

export const PEREZOSO_IMAGENES: Record<string, any> = {
  pulgar:         require('../assets/images/perezoso/perezoso_pulgar.png'),
  llorando:       require('../assets/images/perezoso/perezoso_llorando.png'),
  celebrando:     require('../assets/images/perezoso/perezoso_celebrando.png'),
  celebrando_gif: require('../assets/images/perezoso/contento_noti.gif'),
  llorando_gif:   require('../assets/images/perezoso/triste_noti.gif'),
  enfadado:       require('../assets/images/perezoso/perezoso_enfadado.png'),
  enfadado_gif:   require('../assets/images/perezoso/enfadado_noti.gif'),
  esperando:      require('../assets/images/perezoso/perezoso_esperando.png'),
  esperando_gif:  require('../assets/images/perezoso/aburrido_noti.gif'),
  cansado:        require('../assets/images/perezoso/perezoso_cansado.png'),
  contento_gif:   require('../assets/images/perezoso/alegre_noti.gif'),
  bronce:         require('../assets/images/medallas/broncebg.png'),
  plata:          require('../assets/images/medallas/platabg.png'),
  oro:            require('../assets/images/medallas/orobg.png'),
};

export const NOTIF_CFG: Record<string, { asset: string; msg: string; color: string; sub?: string }> = {
  ontime:   { asset: 'contento_gif',   msg: '¡Genial, conseguiste las 5 ⭐!',          color: Colors.purple, sub: '¡Sigue así!' },
  late:     { asset: 'contento_gif',   msg: '¡Completada un poco tarde! 3 ⭐',         color: Colors.purple, sub: 'Intenta llegar a tiempo la próxima' },
  sinHora:  { asset: 'contento_gif',   msg: '¡Tarea completada! Conseguiste las 5 ⭐', color: Colors.purple, sub: '¡Buen trabajo!' },
  goalmet:  { asset: 'celebrando_gif', msg: '¡Todas las tareas de hoy completadas!',   color: Colors.purple, sub: '¡Eres increíble! 🎉' },
  bronce:          { asset: 'bronce',         msg: '¡Medalla de Bronce conseguida!',               color: '#CD7F32' },
  plata:           { asset: 'plata',          msg: '¡Medalla de Plata conseguida!',                color: '#C0C0C0' },
  oro:             { asset: 'oro',            msg: '¡Medalla de Oro conseguida!',                  color: Colors.gold },
   bajaBronceSin:   { asset: '',   msg: 'Has perdido la medalla de Bronce...',          color: '#CD7F32', sub: '¡Vuelve a conseguirla!' },
  bajaOroPlata:    { asset: 'plata',          msg: 'Vaya... has bajado a Plata',                   color: '#C0C0C0' },
  bajaPlatabronce: { asset: 'bronce',         msg: 'Has bajado a Bronce. ¡Tú puedes recuperarlo!', color: '#CD7F32' },
  cincoMin:        { asset: 'esperando_gif',  msg: '¡Quedan 5 minutos para una tarea!',            color: '#FFD580' },
  saltadas: { asset: 'enfadado_gif',   msg: 'Has saltado varias tareas...',            color: Colors.purple, sub: 'Intenta completarlas mañana' },
  mitadDia:        { asset: 'esperando_gif',  msg: 'Es mediodía y aún no has empezado',            color: '#FFD580' },
  finDia:          { asset: 'enfadado_gif',   msg: '¡Se acaba el día y quedan tareas!',            color: '#FFB3B3' },
  eliminada:{ asset: 'llorando_gif',   msg: '¡Oh no, eliminaste una tarea!',           color: Colors.purple, sub: 'Puedes añadirla cuando quieras' },
  penal10:  { asset: 'enfadado_gif',   msg: 'Ayer te quedó alguna tarea sin hacer. -10 ⭐', color: Colors.red, sub: 'Completa todas las tareas mañana' }
};