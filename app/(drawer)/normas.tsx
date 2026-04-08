import React from 'react';
import {
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

// ── Colores base (ajusta a tu tema si tienes ThemeContext) ──────────────────
type ColorPair = { bg: string; text: string };


const C: {
  bg: string;
  surface: string;
  border: string;
  textPrimary: string;
  textMuted: string;
  green: ColorPair;
  amber: ColorPair;
  red: ColorPair;
  teal: ColorPair;
  purple: ColorPair;
} = {
  bg:          '#F5F4F0',
  surface:     '#FFFFFF',
  border:      'rgba(0,0,0,0.08)',
  textPrimary: '#1A1A1A',
  textMuted:   '#7A7A7A',
  green:  { bg: '#EAF3DE', text: '#3B6D11' },
  amber:  { bg: '#FAEEDA', text: '#854F0B' },
  red:    { bg: '#FCEBEB', text: '#A32D2D' },
  teal:   { bg: '#E1F5EE', text: '#0F6E56' },
  purple: { bg: '#EEEDFE', text: '#A77BBE' },
};

// ── Componentes pequeños ────────────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <Text style={s.sectionTitle}>{children}</Text>;
}

function Badge({ label }: { label: string }) {
  return (
    <View style={[s.badge]}>
      <Text style={[s.badgeText]}>{label}</Text>
    </View>
  );
}

type RuleRowProps = {

  title: string;
  badge: string;
  last?: boolean;
  subtitle?: string;
};

function RuleRow({  title, badge, subtitle, last= false }: RuleRowProps) {
  return (
    <View style={[s.row, last && s.rowLast]}>
      <View style={s.rowContent}>

        <Text style={s.rowTitle}>{title}</Text>
        {subtitle && <Text style={s.rowSubtitle}>{subtitle}</Text>}
      </View>
      <Badge label={badge}  />
    </View>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <View style={s.card}>{children}</View>;
}

function MedalCard({ icon, name, req }: { icon: string; name: string; req: string }) {
  return (
    <View style={s.medalCard}>
      <Text style={s.medalIcon}>{icon}</Text>
      <Text style={s.medalName}>{name}</Text>
      <Text style={s.medalReq}>{req}</Text>
    </View>
  );
}

// ── Pantalla principal ──────────────────────────────────────────────────────

export default function NormasJuego() {
  return (
    <SafeAreaView style={s.safe}>
      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.container}
        showsVerticalScrollIndicator={false}
      >
        {/* Cabecera */}

          <Text style={s.headerTitle}>Normas del juego</Text>


        {/* ── Ganar estrellas ── */}
        <SectionTitle>Cómo ganar estrellas</SectionTitle>
        <Card>
          <RuleRow
            title="Tarea completada a tiempo"
            badge="+5 ⭐"

          />
          <RuleRow

            title="Tarea completada tarde"
            badge="+3 ⭐"
            last
          />
        </Card>

        {/* ── Penalizaciones ── */}
        <SectionTitle>Penalizaciones al final del día</SectionTitle>
        <Card>
          <RuleRow
   
            title="Sin ninguna tarea hecha"
            subtitle="No se completó nada ese día"
            badge="−20 ⭐"
          />
          <RuleRow

            title="Tareas sin completar"
            subtitle="Se hizo algo, pero quedaron pendientes"
            badge="−10 ⭐"
          />
        </Card>

        {/* ── Racha ── */}
        <SectionTitle>Racha diaria</SectionTitle>
        <Card>
          <RuleRow

            title="Racha activa"
            subtitle="Completas tareas días consecutivos"
            badge="+1 por día"
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
        <View style={s.medalGrid}>
          <MedalCard icon="🥉" name="Bronce" req="100 ⭐" />
          <MedalCard icon="🥈" name="Plata"  req="300 ⭐" />
          <MedalCard icon="🥇" name="Oro"    req="600 ⭐" />
        </View>

      
        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Estilos ─────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: C.bg,
  },
  scroll: {
    flex: 1,
  },
  container: {
     flex: 1,
        backgroundColor: '#fff',
        paddingTop: Platform.OS === 'ios' ? 60 : 40,
        paddingHorizontal: 20,
  },

  headerTitle: {
    fontSize: 30,
    fontWeight: '600',
    color: C.purple.text,
    textAlign: 'center',
    marginBottom: 4,
  },
  headerSub: {
    fontSize: 13,
    color: C.textMuted,
    textAlign: 'center',
    paddingHorizontal: 24,
  },

  // Sección
  sectionTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: C.textMuted,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 8,
    marginTop: 20,
    marginLeft: 4,
  },

  // Card contenedor
  card: {
    backgroundColor: C.surface,
    borderRadius: 14,
    borderWidth: 0.5,
    borderColor: C.border,
    overflow: 'hidden',
  },

  // Fila dentro de card
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: C.border,
    gap: 12,
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {
    fontSize: 16,
  },
  rowContent: {
    flex: 1,
  },
  rowTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: C.textPrimary,
    marginBottom: 1,
  },
  rowSubtitle: {
    fontSize: 12,
    color: C.textMuted,
    lineHeight: 16,
  },

  // Badge
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // Medallas
  medalGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  medalCard: {
    flex: 1,
    backgroundColor: C.surface,
    borderRadius: 14,
    borderWidth: 0.5,
    borderColor: C.border,
    paddingVertical: 16,
    alignItems: 'center',
  },
  medalIcon: {
    fontSize: 26,
    marginBottom: 6,
  },
  medalName: {
    fontSize: 13,
    fontWeight: '600',
    color: C.textPrimary,
    marginBottom: 2,
  },
  medalReq: {
    fontSize: 12,
    color: C.textMuted,
  },
});
