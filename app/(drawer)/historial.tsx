// app/(drawer)/historial.tsx
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { useCallback, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Alert,
  Image,
  Linking,
  Modal,
  PixelRatio,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import ViewShot from 'react-native-view-shot';
import { useAvatar } from '../../context/AvatarContext';
import { getTareasHistorial } from '../../database/database';
import { useGamificacion } from '../../hooks/useGamificacion';
import { fechaAppDate, hoyAppStr } from '../../utils/fecha';

const PURPLE    = '#A77BBE';
const ORANGE    = '#FF6B35';
const PURPLE_LT = '#E5D9EE';
const PURPLE_BG = '#F4F0F6';
const GREEN     = '#58CC02';
const RED       = '#FF4444';
const GOLD      = '#FFD700';
const COLORES_PELO = ['#1a1a1a', '#3B1F0E', '#8B4513', '#DAA520', '#E8C47A', '#E8E8E8'];

const DIAS_CORTOS       = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const DIAS_CORTOS_LARGO = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];


function lunesDe(fecha: Date): Date {
  const d = new Date(fecha);
  const diff = d.getDay() === 0 ? -6 : 1 - d.getDay();
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}
function toLocalDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function diasDeSemana(lunes: Date): string[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(lunes); d.setDate(d.getDate() + i); return toLocalDateStr(d);
  });
}
function etiquetaSemana(lunes: Date): string {
  const domingo = new Date(lunes); domingo.setDate(lunes.getDate() + 6);
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' };
  return `${lunes.toLocaleDateString('es-ES', opts)} – ${domingo.toLocaleDateString('es-ES', opts)}`;
}


function fechaReferencia(t: any): string {
  if (t.estado === 'completada' || (t.completed === 1 && !t.estado)) {
    return t.fechaCompletada ?? t.fechaDia ?? '';
  }
  return t.fechaDia ?? t.fechaCompletada ?? '';
}


function StarRow({ count = 0, size = 13 }: { count: number; size?: number }) {
  return (
    <Text
      style={{ fontSize: size, color: GOLD, letterSpacing: 1 }}
      accessibilityLabel={`${Math.max(0, count)} de 5 estrellas`}
    >
      {'★'.repeat(Math.max(0, count))}
      <Text style={{ color: '#DDD' }}>{'★'.repeat(Math.max(0, 5 - count))}</Text>
    </Text>
  );
}


function AvatarMini({ avatar, size = 120 }: { avatar: any; size?: number }) {
  const { tonoPiel, cara, colorPelo, peloCorto, peloLargo, shirt } = avatar;
  const si: 0 | 1 = tonoPiel === 1 ? 1 : 0;
  const colorPeloStr = COLORES_PELO[colorPelo] ?? COLORES_PELO[0];
  const caras = [
    [require('../../assets/images/avatar/cara1_claro.png'), require('../../assets/images/avatar/cara2_claro.png'), require('../../assets/images/avatar/cara3_claro.png')],
    [require('../../assets/images/avatar/cara1_oscuro.png'), require('../../assets/images/avatar/cara2_oscuro.png'), require('../../assets/images/avatar/cara3_oscuro.png')],
  ];
  const camisetas = [
    [require('../../assets/images/avatar/camiseta1_claro.png'), require('../../assets/images/avatar/camiseta2_claro.png')],
    [require('../../assets/images/avatar/camiseta1_oscuro.png'), require('../../assets/images/avatar/camiseta2_oscuro.png')],
  ];
  const peloCortoOpts = [require('../../assets/images/avatar/pelo1.png'), require('../../assets/images/avatar/pelo3.png')];
  const peloLargoOpts = [require('../../assets/images/avatar/pelo5.png'), require('../../assets/images/avatar/pelo6.png')];

  return (
    <View style={{ width: size, height: size * 1.2, position: 'relative' }} accessibilityElementsHidden importantForAccessibility="no">
      <Image source={camisetas[si][shirt] ?? camisetas[0][0]} style={{ position: 'absolute', top: size*0.70, left: -size*0.12, width: size*1.3, height: size*1.3, zIndex: 3 }} resizeMode="contain" accessibilityIgnoresInvertColors />
      <Image source={caras[si][cara] ?? caras[0][0]} style={{ position: 'absolute', top: -size*0.02, left: 0, width: size, height: size, zIndex: 1 }} resizeMode="contain" accessibilityIgnoresInvertColors />
      {peloCorto >= 0 && peloCortoOpts[peloCorto] && (
        <Image source={peloCortoOpts[peloCorto]} style={{ position: 'absolute', top: -size*0.28, left: size*-0.02, width: size*1.05, height: size*0.8, zIndex: 4, tintColor: colorPeloStr }} resizeMode="contain" accessibilityIgnoresInvertColors />
      )}
      {peloCorto < 0 && peloLargo >= 0 && peloLargoOpts[peloLargo] && (
        <Image source={peloLargoOpts[peloLargo]} style={{ position: 'absolute', top: -size*0.27, left: size*-0.1, width: size*1.20, height: size*1.20, zIndex: 4, tintColor: colorPeloStr }} resizeMode="contain" accessibilityIgnoresInvertColors />
      )}
    </View>
  );
}


function TarjetaCompartir({ avatar, gami, tareasUltimaSemana }: {
  avatar: any; gami: any; tareasUltimaSemana: any[];
}) {
  const medallaEmoji = gami.medalla ? ({ bronce: '🥉', plata: '🥈', oro: '🥇' } as any)[gami.medalla] : null;
  const completadas  = tareasUltimaSemana.filter(t => t.estado === 'completada' || (t.completed === 1 && !t.estado));
  const canceladas   = tareasUltimaSemana.filter(t => t.estado === 'cancelada' || t.estado === 'vencida');

  return (
    <View style={tc.card} collapsable={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View style={tc.header}><Text style={tc.headerTxt}>🌟 RutinaQuest</Text></View>
      <View style={tc.avatarRow}>
        <View style={tc.avatarWrap}><AvatarMini avatar={avatar} size={110} /></View>
        <View style={tc.statsCol}>
          <Text style={tc.statLine}>⭐ {gami.estrellas} estrellas</Text>
          <Text style={tc.statLine}>🔥 {gami.racha} días de racha</Text>
          {medallaEmoji && <Text style={tc.statLine}>{medallaEmoji} Medalla de {gami.medalla}</Text>}
          <View style={tc.statsDivider} />
          <Text style={tc.statLine}>✅ {completadas.length} esta semana</Text>
          <Text style={tc.statLine}>❌ {canceladas.length} canceladas</Text>
        </View>
      </View>
      {tareasUltimaSemana.length > 0 && (
        <View style={tc.tareasSection}>
          <Text style={tc.tareasSectionTitle}>Esta semana</Text>
          {tareasUltimaSemana.slice(0, 10).map((t, i) => {
            const ok = t.estado === 'completada' || (t.completed === 1 && !t.estado);
            return (
              <View key={i} style={tc.tareaFila}>
                <Text style={tc.tareaEmoji}>{ok ? '✅' : '❌'}</Text>
                <Text style={[tc.tareaTxt, !ok && { color: '#AAA', textDecorationLine: 'line-through' }]} numberOfLines={1}>{t.title}</Text>
                <Text style={tc.tareaStars}>{'★'.repeat(t.stars ?? (ok ? 5 : 0))}</Text>
              </View>
            );
          })}
        </View>
      )}
      <Text style={tc.footer}>{new Date().toLocaleDateString('es-ES', { dateStyle: 'long' })}</Text>
    </View>
  );
}

const tc = StyleSheet.create({
  card:               { width: 320, backgroundColor: '#fff', borderRadius: 20, overflow: 'hidden', borderWidth: 2, borderColor: PURPLE_LT },
  header:             { backgroundColor: PURPLE, paddingVertical: 12, alignItems: 'center' },
  headerTxt:          { color: '#fff', fontSize: 18, fontWeight: '800', letterSpacing: 0.5 },
  avatarRow:          { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8, gap: 12, backgroundColor: PURPLE_BG },
  avatarWrap:         { width: 110, height: 132, overflow: 'hidden' },
  statsCol:           { flex: 1, gap: 4 },
  statLine:           { fontSize: 13, color: '#444', fontWeight: '600' },
  statsDivider:       { height: 1, backgroundColor: PURPLE_LT, marginVertical: 4 },
  tareasSection:      { paddingHorizontal: 14, paddingTop: 10, paddingBottom: 4 },
  tareasSectionTitle: { fontSize: 11, fontWeight: '700', color: '#BBB', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 },
  tareaFila:          { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 5 },
  tareaEmoji:         { fontSize: 14 },
  tareaTxt:           { flex: 1, fontSize: 13, color: '#333', fontWeight: '500' },
  tareaStars:         { fontSize: 11, color: GOLD },
  footer:             { textAlign: 'center', fontSize: 10, color: '#BBB', paddingVertical: 8, borderTopWidth: 1, borderTopColor: PURPLE_LT },
});


export default function Historial() {
  const router     = useRouter();
  const gami       = useGamificacion();
  const { avatar } = useAvatar();
  const shotRef    = useRef<any>(null);

  const [search,       setSearch]       = useState('');
  const [historial,    setHistorial]    = useState<any[]>([]);
  const [compartiendo, setCompartiendo] = useState(false);
  const [modalCaptura, setModalCaptura] = useState(false);
  const [destinoPend,  setDestinoPend]  = useState<'whatsapp'|'gmail'|'nativo'|null>(null);
  const [semanaActual, setSemanaActual] = useState(() => lunesDe(fechaAppDate()));

  const hoy = hoyAppStr();
  const [diaSeleccionado, setDiaSeleccionado] = useState(hoy);

  useFocusEffect(useCallback(() => { setHistorial(getTareasHistorial()); }, []));

  const esMismaSemana = (lunes: Date) =>
    toLocalDateStr(lunes) === toLocalDateStr(lunesDe(fechaAppDate()));

  const irAnterior = () => setSemanaActual(prev => {
    const d = new Date(prev); d.setDate(d.getDate()-7);
    setDiaSeleccionado(toLocalDateStr(d)); return d;
  });
  const irSiguiente = () => setSemanaActual(prev => {
    if (esMismaSemana(prev)) return prev;
    const d = new Date(prev); d.setDate(d.getDate()+7);
    setDiaSeleccionado(esMismaSemana(d) ? hoy : toLocalDateStr(d)); return d;
  });

  const esEstaSemana = esMismaSemana(semanaActual);
  const dias         = diasDeSemana(semanaActual);


  const tareasUltimaSemana = historial.filter(t => dias.includes(fechaReferencia(t)));

 
  const tareasDelDia = historial.filter(t =>
    fechaReferencia(t) === diaSeleccionado &&
    t.title.toLowerCase().includes(search.toLowerCase())
  );
  const completadasDia = tareasDelDia.filter(t => t.estado === 'completada' || (t.completed === 1 && !t.estado));
  const canceladasDia  = tareasDelDia.filter(t => t.estado === 'cancelada');
  const vencidasDia    = tareasDelDia.filter(t => t.estado === 'vencida');

  const nombreDia = new Date(diaSeleccionado+'T12:00:00')
    .toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });

 
  const buildTextoCompartir = () => {
    const completadas  = tareasUltimaSemana.filter(t => t.estado === 'completada' || (t.completed === 1 && !t.estado));
    const canceladas   = tareasUltimaSemana.filter(t => t.estado === 'cancelada' || t.estado === 'vencida');
    const medallaEmoji = gami.medalla ? ({ bronce: '🥉', plata: '🥈', oro: '🥇' } as any)[gami.medalla] : '';
    return [
      '🌟 RutinaQuest · Mi historial', '',
      `⭐ ${gami.estrellas} estrellas`,
      `🔥 ${gami.racha} días de racha`,
      medallaEmoji ? `${medallaEmoji} Medalla de ${gami.medalla}` : '',
      '',
      `✅ ${completadas.length} completadas esta semana`,
      `❌ ${canceladas.length} canceladas`, '',
      '📋 Tareas de la semana:',
      ...tareasUltimaSemana.slice(0, 10).map(t => {
        const ok = t.estado === 'completada' || (t.completed === 1 && !t.estado);
        return `${ok ? '✅' : '❌'} ${t.title}`;
      }),
      '', new Date().toLocaleDateString('es-ES', { dateStyle: 'long' }),
    ].filter(Boolean).join('\n');
  };


  const iniciarCompartir = (destino: 'whatsapp'|'gmail'|'nativo') => {
    if (historial.length === 0) {
      Alert.alert('Sin historial', 'Aún no tienes tareas completadas para exportar.');
      return;
    }

    const texto = buildTextoCompartir();

    if (Platform.OS === 'web') {
      if (destino === 'whatsapp') {
        window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, '_blank');
      } else if (destino === 'gmail') {
        window.open(`mailto:?subject=${encodeURIComponent('Mi historial de RutinaQuest')}&body=${encodeURIComponent(texto)}`, '_self');
      } else {
        if (navigator.share) {
          navigator.share({ title: 'Mi historial de RutinaQuest', text: texto }).catch(() => {});
        } else {
          navigator.clipboard.writeText(texto).then(() => {
            Alert.alert('Copiado', 'El historial se ha copiado al portapapeles.');
          });
        }
      }
      return;
    }

    if (destino === 'gmail') {
      Linking.openURL(`mailto:?subject=${encodeURIComponent('Mi historial de RutinaQuest')}&body=${encodeURIComponent(texto)}`);
      return;
    }

    setDestinoPend(destino);
    setModalCaptura(true);
  };

  const onModalListo = async () => {
    if (!destinoPend) return;
    setCompartiendo(true);
    try {
      await new Promise(r => setTimeout(r, 800));
      const uri: string = await shotRef.current.capture();

      if (Platform.OS === 'ios') {
        setCompartiendo(false);
        setModalCaptura(false);
        setDestinoPend(null);
        await new Promise(r => setTimeout(r, 350));
        const disponible = await Sharing.isAvailableAsync();
        if (disponible) {
          await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Compartir perfil RutinaQuest', UTI: 'public.png' });
        }
      } else {
        setCompartiendo(false);
        setModalCaptura(false);
        setDestinoPend(null);
        await new Promise(r => setTimeout(r, 100));
        await Share.share({ message: buildTextoCompartir(), title: 'Mi historial de RutinaQuest' });
      }
    } catch (e: any) {
      console.warn('Error compartir:', e?.message ?? e);
      Alert.alert('Error', e?.message ?? String(e));
    } finally {
      setCompartiendo(false);
      setModalCaptura(false);
      setDestinoPend(null);
    }
  };


  return (
    <View style={styles.root}>

    
      <Modal visible={modalCaptura} transparent animationType="none" onShow={onModalListo} accessibilityViewIsModal={false}>
        <View style={styles.modalCapturaOverlay} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <ViewShot ref={shotRef} options={{ format: 'png', quality: 1, result: 'tmpfile' }}>
            <TarjetaCompartir avatar={avatar} gami={gami} tareasUltimaSemana={tareasUltimaSemana} />
          </ViewShot>
          {compartiendo && (
            <View style={styles.capturaLoading}>
              <Text style={styles.capturaLoadingTxt}>Preparando imagen...</Text>
            </View>
          )}
        </View>
      </Modal>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
        accessible={false}
      >
        <Text style={styles.titulo} accessibilityRole="header">Historial</Text>

        

        {/* Botones compartir */}
        <View style={styles.shareRow} accessible={false}>
          <Pressable onPress={() => router.replace('/')} style={styles.btnInicio} accessible accessibilityRole="button" accessibilityLabel="Ir a Inicio">
            <Ionicons name="home-outline" size={16} color={PURPLE} accessibilityElementsHidden importantForAccessibility="no" />
            <Text style={styles.btnInicioTxt}>Inicio</Text>
          </Pressable>

          <View style={styles.shareBtnsRow} accessible={false}>
            <Pressable
              onPress={() => iniciarCompartir('whatsapp')}
              disabled={compartiendo}
              style={[styles.shareBtn, { backgroundColor: '#25D366' }, compartiendo && { opacity: 0.5 }]}
              accessible accessibilityRole="button"
              accessibilityLabel="Compartir por WhatsApp"
              accessibilityState={{ disabled: compartiendo }}
            >
              <Ionicons name="logo-whatsapp" size={16} color="#fff" accessibilityElementsHidden importantForAccessibility="no" />
              <Text style={styles.shareBtnTxt} numberOfLines={1}>WhatsApp</Text>
            </Pressable>

            <Pressable
              onPress={() => iniciarCompartir('gmail')}
              disabled={compartiendo}
              style={[styles.shareBtn, { backgroundColor: '#EA4335' }, compartiendo && { opacity: 0.5 }]}
              accessible accessibilityRole="button"
              accessibilityLabel="Compartir por Gmail"
              accessibilityState={{ disabled: compartiendo }}
            >
              <Ionicons name="mail-outline" size={16} color="#fff" accessibilityElementsHidden importantForAccessibility="no" />
              <Text style={styles.shareBtnTxt} numberOfLines={1}>Gmail</Text>
            </Pressable>

            <Pressable
              onPress={() => iniciarCompartir('nativo')}
              disabled={compartiendo}
              style={[styles.shareBtn, { backgroundColor: PURPLE }, compartiendo && { opacity: 0.5 }]}
              accessible accessibilityRole="button"
              accessibilityLabel={compartiendo ? 'Preparando imagen' : 'Más opciones para compartir'}
              accessibilityState={{ disabled: compartiendo }}
            >
              <Ionicons name="share-social-outline" size={16} color="#fff" accessibilityElementsHidden importantForAccessibility="no" />
              <Text style={styles.shareBtnTxt} numberOfLines={1}>{compartiendo ? '...' : 'Más'}</Text>
            </Pressable>
          </View>
        </View>

        {/* Buscador */}
        <View style={styles.searchBar} accessible accessibilityRole="search" accessibilityLabel="Buscar tarea en historial">
          <TextInput
            placeholder="Buscar tarea..."
            value={search}
            onChangeText={setSearch}
            style={{ flex: 1, fontSize: 15 }}
            accessibilityLabel="Campo de búsqueda"
            accessibilityHint="Filtra las tareas del historial por nombre"
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
          <Ionicons name="search" size={18} color="#999" accessibilityElementsHidden importantForAccessibility="no" />
        </View>

        {/* Selector semana */}
        <View style={styles.weekSelector} accessible={false}>
          <Pressable
            onPress={irAnterior}
            style={[styles.weekArrow, { minWidth: 44, minHeight: 44, justifyContent: 'center', alignItems: 'center' }]}
            accessible accessibilityRole="button" accessibilityLabel="Semana anterior"
          >
            <Ionicons name="chevron-back" size={22} color={PURPLE} />
          </Pressable>

          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={styles.weekLabel} accessibilityLabel={`Semana del ${etiquetaSemana(semanaActual)}`}>
              {etiquetaSemana(semanaActual)}
            </Text>
          </View>

          <Pressable
            onPress={irSiguiente}
            disabled={esEstaSemana}
            style={[styles.weekArrow, esEstaSemana && { opacity: 0.3 }, { minWidth: 44, minHeight: 44, justifyContent: 'center', alignItems: 'center' }]}
            accessible accessibilityRole="button" accessibilityLabel="Semana siguiente"
            accessibilityState={{ disabled: esEstaSemana }}
          >
            <Ionicons name="chevron-forward" size={22} color={PURPLE} />
          </Pressable>
        </View>

        {/* Tira de días */}
        <View style={styles.daysStrip} accessible={false}>
          {dias.map((fecha, idx) => {
            const sel   = fecha === diaSeleccionado;
            const esHoy = fecha === hoy;

            // Usar fechaReferencia correcta para los contadores
            const nC = historial.filter(t =>
              fechaReferencia(t) === fecha &&
              (t.estado === 'completada' || (t.completed === 1 && !t.estado))
            ).length;
            const nX = historial.filter(t =>
              fechaReferencia(t) === fecha &&
              (t.estado === 'cancelada' || t.estado === 'vencida')
            ).length;

            const partes = [DIAS_CORTOS_LARGO[idx]];
            if (esHoy) partes.push('hoy');
            if (sel)   partes.push('seleccionado');
            if (nC > 0) partes.push(`${nC} completada${nC > 1 ? 's' : ''}`);
            if (nX > 0) partes.push(`${nX} no realizada${nX > 1 ? 's' : ''}`);

            return (
              <Pressable
                key={fecha}
                onPress={() => { setDiaSeleccionado(fecha); AccessibilityInfo.announceForAccessibility(partes.join(', ')); }}
                style={[styles.dayBtn, sel && styles.dayBtnSel, esHoy && !sel && styles.dayBtnHoy]}
                accessible accessibilityRole="button"
                accessibilityLabel={partes.join(', ')}
                accessibilityState={{ selected: sel }}
              >
                <Text style={[styles.dayBtnLbl, sel && { color: '#fff', fontWeight: '700' }, esHoy && !sel && { color: PURPLE, fontWeight: '700' }]}
                  accessibilityElementsHidden importantForAccessibility="no"
                >
                  {DIAS_CORTOS[idx]}
                </Text>
                <View style={{ flexDirection: 'row', gap: 2, marginTop: 3 }} accessibilityElementsHidden importantForAccessibility="no">
                  {nC > 0 && <View style={[styles.dot, { backgroundColor: sel ? '#fff' : GREEN }]} />}
                  {nX > 0 && <View style={[styles.dot, { backgroundColor: sel ? '#fcc' : RED }]} />}
                </View>
              </Pressable>
            );
          })}
        </View>

        {/* Cabecera día */}
        <View style={styles.diaHeader}>
          <Text
            style={styles.diaNombre}
            accessibilityLabel={diaSeleccionado === hoy ? `Hoy, ${nombreDia}` : nombreDia}
          >
            {diaSeleccionado === hoy ? `Hoy · ${nombreDia}` : nombreDia.charAt(0).toUpperCase()+nombreDia.slice(1)}
          </Text>
          {tareasDelDia.length > 0 && (
            <View
              style={styles.diaBadgesRow}
              accessible
              accessibilityLabel={`${completadasDia.length} realizadas, ${canceladasDia.length + vencidasDia.length} no realizadas`}
            >
              <View style={[styles.diaBadge, { backgroundColor: PURPLE_BG, borderColor: PURPLE, borderWidth: 1 }]}>
                <Text style={[styles.diaBadgeText, { color: PURPLE }]} accessibilityElementsHidden importantForAccessibility="no">✓ {completadasDia.length}</Text>
              </View>
              <View style={[styles.diaBadge, { backgroundColor: PURPLE_BG, borderColor: PURPLE, borderWidth: 1 }]}>
                <Text style={[styles.diaBadgeText, { color: PURPLE }]} accessibilityElementsHidden importantForAccessibility="no">✕ {canceladasDia.length + vencidasDia.length}</Text>
              </View>
            </View>
          )}
        </View>

        {/* Contenido día */}
        {tareasDelDia.length === 0 ? (
          <View style={styles.emptyBox} accessible accessibilityLiveRegion="polite" accessibilityLabel="Sin tareas este día. Pulsa otro día para ver su historial">
            <Text style={styles.emptyText}>Sin tareas este día</Text>
            <Text style={styles.emptySubText}>Pulsa otro día para ver su historial</Text>
          </View>
        ) : (
          <View style={styles.columnasRow} accessible={false}>
            {/* Columna realizadas */}
            <View style={styles.columna}>
              <View style={[styles.columnaHeader, { backgroundColor: PURPLE_BG, borderColor: PURPLE }]}>
                <Text style={[styles.columnaHeaderText, { color: PURPLE }]} accessibilityRole="header" accessibilityLabel={`Realizadas: ${completadasDia.length}`}>
                  ✓ Realizadas
                </Text>
              </View>
              {completadasDia.length === 0
                ? <Text style={styles.colEmpty} accessibilityLabel="Ninguna tarea realizada">Ninguna</Text>
                : completadasDia.map(item => (
                  <View key={item.id} style={[styles.tareaCard, { borderLeftColor: GREEN }]} accessible accessibilityLabel={`${item.title}, ${item.stars ?? 5} de 5 estrellas${item.hora && item.hora !== 'Sin hora' ? `, hora ${item.hora}` : ''}`}>
                    {item.pictogramId && (
                      <Image source={{ uri: `https://static.arasaac.org/pictograms/${item.pictogramId}/${item.pictogramId}_300.png` }} style={styles.pictogram} accessibilityElementsHidden importantForAccessibility="no" accessibilityIgnoresInvertColors />
                    )}
                    <Text style={styles.tareaTitle} numberOfLines={2} accessibilityElementsHidden importantForAccessibility="no">{item.title}</Text>
                    <StarRow count={item.stars ?? 5} size={12} />
                    {item.hora && item.hora !== 'Sin hora' && (
                      <Text style={styles.tareaHora} accessibilityElementsHidden importantForAccessibility="no">{item.hora}</Text>
                    )}
                  </View>
                ))
              }
            </View>

            {/* Columna no realizadas: canceladas + vencidas (saltadas) */}
            <View style={styles.columna}>
              <View style={[styles.columnaHeader, { backgroundColor: PURPLE_BG, borderColor: PURPLE }]}>
                <Text style={[styles.columnaHeaderText, { color: PURPLE }]} accessibilityRole="header" accessibilityLabel={`No realizadas: ${canceladasDia.length + vencidasDia.length}`}>
                  ✕ No realizadas
                </Text>
              </View>

              {canceladasDia.length === 0 && vencidasDia.length === 0 ? (
                <Text style={styles.colEmpty} accessibilityLabel="Ninguna tarea sin realizar">Ninguna</Text>
              ) : (
                <>
                  {/* Eliminadas  */}
                  {canceladasDia.map(item => (
                    <View key={item.id} style={[styles.tareaCard, { borderLeftColor: RED, opacity: 0.75 }]} accessible accessibilityLabel={`${item.title}, eliminada${item.hora && item.hora !== 'Sin hora' ? `, hora ${item.hora}` : ''}`}>
                      {item.pictogramId && (
                        <Image source={{ uri: `https://static.arasaac.org/pictograms/${item.pictogramId}/${item.pictogramId}_300.png` }} style={styles.pictogram} accessibilityElementsHidden importantForAccessibility="no" accessibilityIgnoresInvertColors />
                      )}
                      <Text style={[styles.tareaTitle, { textDecorationLine: 'line-through', color: '#888' }]} numberOfLines={2} accessibilityElementsHidden importantForAccessibility="no">
                        {item.title}
                      </Text>
                      <Text style={{ fontSize: 10, color: RED, fontWeight: '600', marginTop: 2 }} accessibilityElementsHidden importantForAccessibility="no">Eliminada</Text>
                      {item.hora && item.hora !== 'Sin hora' && (
                        <Text style={styles.tareaHora} accessibilityElementsHidden importantForAccessibility="no">{item.hora}</Text>
                      )}
                    </View>
                  ))}

                  {/* Sin hacer — se quedaron pendientes */}
                  {vencidasDia.map(item => (
                    <View key={item.id} style={[styles.tareaCard, { borderLeftColor: ORANGE, opacity: 0.85 }]} accessible accessibilityLabel={`${item.title}, saltada${item.hora && item.hora !== 'Sin hora' ? `, hora ${item.hora}` : ''}`}>
                      {item.pictogramId && (
                        <Image source={{ uri: `https://static.arasaac.org/pictograms/${item.pictogramId}/${item.pictogramId}_300.png` }} style={styles.pictogram} accessibilityElementsHidden importantForAccessibility="no" accessibilityIgnoresInvertColors />
                      )}
                      <Text style={[styles.tareaTitle, { textDecorationLine: 'line-through', color: '#888' }]} numberOfLines={2} accessibilityElementsHidden importantForAccessibility="no">
                        {item.title}
                      </Text>
                      <Text style={{ fontSize: 10, color: ORANGE, fontWeight: '600', marginTop: 2 }} accessibilityElementsHidden importantForAccessibility="no">Saltada</Text>
                      {item.hora && item.hora !== 'Sin hora' && (
                        <Text style={styles.tareaHora} accessibilityElementsHidden importantForAccessibility="no">{item.hora}</Text>
                      )}
                    </View>
                  ))}
                </>
              )}
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}


const fs = (size: number) => Math.round(size * Math.min(PixelRatio.getFontScale(), 1.4));

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff', paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingHorizontal: 20 },

  modalCapturaOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' },
  capturaLoading:      { position: 'absolute', bottom: 40, backgroundColor: PURPLE, borderRadius: 20, paddingHorizontal: 20, paddingVertical: 10 },
  capturaLoadingTxt:   { color: '#fff', fontWeight: '700', fontSize: fs(14) },

  btnInicio:    { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 7, backgroundColor: PURPLE + '18', borderRadius: 20, alignSelf: 'center', minHeight: 40 },
  btnInicioTxt: { color: PURPLE, fontWeight: '600', fontSize: fs(13) },
  titulo:       { fontSize: fs(30), fontWeight: '800', color: PURPLE, marginBottom: 16, textAlign: 'center' },

  shareRow:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, gap: 8 },
  shareBtnsRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 },
  shareBtn:     { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 22, minHeight: 40, flexShrink: 1 },
  shareBtnTxt:  { color: '#fff', fontWeight: '700', fontSize: fs(12), flexShrink: 1 },

  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f3f2f2', borderRadius: 25, paddingHorizontal: 15, paddingVertical: 10, marginBottom: 20, minHeight: 44 },

  weekSelector: { flexDirection: 'row', alignItems: 'center', backgroundColor: PURPLE_BG, borderRadius: 16, paddingVertical: 10, paddingHorizontal: 6, marginBottom: 12, borderWidth: 1.5, borderColor: PURPLE_LT },
  weekArrow:    { padding: 6 },
  weekLabel:    { fontSize: fs(16), fontWeight: '700', color: PURPLE, textAlign: 'center', flexShrink: 1 },

  daysStrip: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FAFAFA', borderRadius: 14, paddingVertical: 12, paddingHorizontal: 8, marginBottom: 20, borderWidth: 1, borderColor: '#EEE' },
  dayBtn:    { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 8, borderRadius: 12, marginHorizontal: 2, minHeight: 50 },
  dayBtnSel: { backgroundColor: PURPLE },
  dayBtnHoy: { backgroundColor: PURPLE_LT },
  dayBtnLbl: { fontSize: fs(11), color: '#AAA', fontWeight: '600' },
  dot:       { width: 5, height: 5, borderRadius: 3 },

  diaHeader:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  diaNombre:    { fontSize: fs(13), fontWeight: '700', color: '#555', flex: 1, textTransform: 'capitalize', flexShrink: 1 },
  diaBadgesRow: { flexDirection: 'row', gap: 6 },
  diaBadge:     { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  diaBadgeText: { fontSize: fs(12), fontWeight: '700' },

  columnasRow:       { flexDirection: 'row', gap: 12 },
  columna:           { flex: 1 },
  columnaHeader:     { borderRadius: 10, borderWidth: 1.5, paddingVertical: 7, alignItems: 'center', marginBottom: 10 },
  columnaHeaderText: { fontSize: fs(12), fontWeight: '700' },
  colEmpty:          { fontSize: fs(12), color: '#CCC', textAlign: 'center', marginTop: 12 },

  tareaCard:  { backgroundColor: '#FAFAFA', borderRadius: 12, padding: 10, marginBottom: 8, borderLeftWidth: 3 },
  pictogram:  { width: 36, height: 36, borderRadius: 6, marginBottom: 6 },
  tareaTitle: { fontSize: fs(12), color: '#333', fontWeight: '600', marginBottom: 4, flexShrink: 1 },
  tareaHora:  { fontSize: fs(11), color: '#AAA', marginTop: 2 },

  emptyBox:     { alignItems: 'center', paddingVertical: 30 },
  emptyText:    { fontSize: fs(16), color: '#AAA', fontWeight: '600', textAlign: 'center' },
  emptySubText: { fontSize: fs(13), color: '#CCC', marginTop: 6 },
});