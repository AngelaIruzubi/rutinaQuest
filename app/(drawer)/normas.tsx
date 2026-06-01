import { Colors } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import {
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { UMBRALES_MEDALLA } from '../../constants/medallas';

type ColorPair = { bg: string; text: string };
const C = {
  bg:          '#F5F4F0',
  surface:     '#FFFFFF',
  border:      'rgba(0,0,0,0.08)',
  textPrimary: '#1A1A1A',
  textMuted:   '#7A7A7A',
  purple: { bg: '#EEEDFE', text: '#A77BBE' } as ColorPair,
};



function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <Text
      style={estilos.sectionTitle}
      accessibilityRole="header"
    >
      {children}
    </Text>
  );
}

function Badge({ label }: { label: string }) {
  return (
    <View style={estilos.badge} accessibilityElementsHidden importantForAccessibility="no">
      <Text style={estilos.badgeText}>{label}</Text>
    </View>
  );
}

type RuleRowProps = {
  title: string;
  badge: string;
  last?: boolean;
  subtitle?: string;
};

function RuleRow({ title, badge, subtitle, last = false }: RuleRowProps) {

  const a11yLabel = subtitle ? `${title}. ${subtitle}. ${badge}` : `${title}. ${badge}`;

  return (
    <View
      style={[estilos.row, last && estilos.rowLast]}
      accessible
      accessibilityLabel={a11yLabel}
    >
      <View style={estilos.rowContent}>
        <Text style={estilos.rowTitle} accessibilityElementsHidden importantForAccessibility="no">{title}</Text>
        {subtitle && (
          <Text style={estilos.rowSubtitle} accessibilityElementsHidden importantForAccessibility="no">{subtitle}</Text>
        )}
      </View>
      <Badge label={badge} />
    </View>
  );
}

function Card({ children, a11yLabel }: { children: React.ReactNode; a11yLabel?: string }) {
  return (
    <View
      style={estilos.card}
      accessible={false}
      accessibilityLabel={a11yLabel}
    >
      {children}
    </View>
  );
}

function MedalCard({ icon, name, req }: { icon: string; name: string; req: string }) {
  return (
    <View
      style={estilos.medalCard}
      accessible
      accessibilityLabel={`Medalla de ${name}, se consigue con ${req}`}
    >
      <Text style={estilos.medalIcon} accessibilityElementsHidden importantForAccessibility="no">{icon}</Text>
      <Text style={estilos.medalName} accessibilityElementsHidden importantForAccessibility="no">{name}</Text>
      <Text style={estilos.medalReq}  accessibilityElementsHidden importantForAccessibility="no">{req}</Text>
    </View>
  );
}



export default function NormasJuego() {
  return (
    <SafeAreaView style={estilos.safe}>
      <ScrollView
        style={estilos.scroll}
        contentContainerStyle={estilos.container}
        showsVerticalScrollIndicator={false}
        accessible={false}
      >
        {/* Cabecera */}
        <Text style={estilos.headerTitle} accessibilityRole="header">
          Normas del juego
        </Text>

        <Pressable
          onPress={() => router.replace('/')}
          style={estilos.btnInicio}
          accessible
          accessibilityRole="button"
          accessibilityLabel="Ir a Inicio"
        >
          <Ionicons name="home-outline" size={16} color={Colors.purple} accessibilityElementsHidden importantForAccessibility="no" />
          <Text style={estilos.btnInicioTxt}>Inicio</Text>
        </Pressable>
        {/* ── Programar tareas ── */}
        <SectionTitle>Programar tareas</SectionTitle>
        <Card>
          <RuleRow
            title="Tarea puntual"
            badge="Home/Calendario"
          />
          <RuleRow
            title="Tarea repetitiva diaria o semanal"
            badge="Calendario"
            last
          />
        </Card>

        {/* ── Ganar estrellas ── */}
        <SectionTitle>Cómo ganar estrellas</SectionTitle>
        <Card>
          <RuleRow
            title="Tarea completada a tiempo o sin hora"
            badge="+5 estrellas"
          />
          <RuleRow
            title="Tarea completada tarde"
            badge="+3 estrellas"
            last
          />
        </Card>

        {/* ── Penalizaciones ── */}
        <SectionTitle>Penalizaciones al final del día</SectionTitle>
        <Card>
          <RuleRow
            title="Tareas sin completar"
            subtitle="Se hizo algo, pero quedaron pendientes"
            badge="Menos 10 estrellas"
            last
          />
        </Card>

        {/* ── Racha ── */}
        <SectionTitle>Racha diaria</SectionTitle>
        <Card>
          <RuleRow
            title="Racha activa"
            subtitle="Completas tareas días consecutivos"
            badge="Más 1 por día"
          />
          <RuleRow
            title="Racha rota"
            subtitle="Saltas un día sin completar nada"
            badge="Vuelve a 0"
            last
          />
        </Card>

        {/* ── Medallas ── */}
        <SectionTitle>Medallas</SectionTitle>
        <View
          style={estilos.medalGrid}
          accessible={false}
          accessibilityLabel="Cuadrícula de medallas"
        >
          <MedalCard icon="🥉" name="Bronce" req={`${UMBRALES_MEDALLA.bronce} ⭐`} />
          <MedalCard icon="🥈" name="Plata"  req={`${UMBRALES_MEDALLA.plata} ⭐`}  />
          <MedalCard icon="🥇" name="Oro"    req={`${UMBRALES_MEDALLA.oro} ⭐`}    />
                  </View>

      </ScrollView>
    </SafeAreaView>
  );
}



const estilos = StyleSheet.create({
  safe:      { flex: 1, backgroundColor: C.bg },
  scroll:    { flex: 1 },
  container: {
    backgroundColor: '#fff',
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: 20,
    paddingBottom: 60,
  },

  headerTitle: {
    fontSize: 30, fontWeight: '800',
    color: C.purple.text, textAlign: 'center', marginBottom: 4,
  },

  sectionTitle: {
    fontSize: 11, fontWeight: '600', color: C.textMuted,
    letterSpacing: 0.8, textTransform: 'uppercase',
    marginBottom: 8, marginTop: 20, marginLeft: 4,
  },

  card: {
    backgroundColor: C.surface, borderRadius: 14,
    borderWidth: 0.5, borderColor: C.border, overflow: 'hidden',
  },

  btnInicio: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 7,
    backgroundColor: Colors.purple + '18', borderRadius: 20,
    alignSelf: 'flex-start', marginBottom: 8,
    minHeight: 44,
  },
  btnInicioTxt: { color: Colors.purple, fontWeight: '600', fontSize: 13 },

  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 12, paddingHorizontal: 14,
    borderBottomWidth: 0.5, borderBottomColor: C.border,
    gap: 12, minHeight: 52,
  },
  rowLast:    { borderBottomWidth: 0 },
  rowContent: { flex: 1 },
  rowTitle:   { fontSize: 14, fontWeight: '500', color: C.textPrimary, marginBottom: 1 },
  rowSubtitle:{ fontSize: 12, color: C.textMuted, lineHeight: 16 },

  badge:     { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeText: { fontSize: 12, fontWeight: '600' },

  medalGrid: { flexDirection: 'row', gap: 8 },
  medalCard: {
    flex: 1, backgroundColor: C.surface,
    borderRadius: 14, borderWidth: 0.5, borderColor: C.border,
    paddingVertical: 16, alignItems: 'center',
    minHeight: 90,
  },
  medalIcon: { fontSize: 26, marginBottom: 6 },
  medalName: { fontSize: 13, fontWeight: '600', color: C.textPrimary, marginBottom: 2 },
  medalReq:  { fontSize: 12, color: C.textMuted },
});

