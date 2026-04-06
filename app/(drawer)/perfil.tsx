import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  Image, Pressable, ScrollView,
  StyleSheet, Text, useWindowDimensions, View,
} from 'react-native';
import { useAvatar } from '../../context/AvatarContext';

// ─── Paletas ──────────────────────────────────────────────────────────────────
const TONOS_PIEL   = ['#F5C89A',  '#7B3F2C'];
const COLORES_PELO = ['#1a1a1a', '#3B1F0E', '#8B4513', '#DAA520', '#E8C47A', '#E8E8E8'];

const PURPLE = '#e9d3f5';
const BG     = '#EEF4FB';



// ─── Tabs de categorías ───────────────────────────────────────────────────────
const TABS = [
  { id: 'piel',      icon: 'palette-outline', title: 'Tono de piel' },
  { id: 'cara',      icon: 'emoticon-outline',         title: 'Cara' },
  { id: 'pelo',      icon: 'hair-dryer-outline',           title: 'Pelo' },
  { id: 'colorPelo', icon: 'brush-outline',         title: 'Color de pelo' },
  { id: 'camiseta',  icon: 'tshirt-crew-outline',         title: 'Camiseta' },
];

export default function Perfil() {
  const { width } = useWindowDimensions();
  const isTablet  = width >= 768;
  const { avatar, updateAvatar } = useAvatar();
  const { tonoPiel, cara, colorPelo, peloCorto, peloLargo, shirt } = avatar;

  const [tabActivo, setTabActivo] = (require('react').useState)('piel');

  // Índice seguro para los assets de piel (0 o 1)
  const si: 0 | 1 = tonoPiel === 1 ? 1 : 0;

  // ── Assets ────────────────────────────────────────────────────────────────
  const caras = [
    [
      require('../../assets/images/avatar/cara1_claro.png'),
      require('../../assets/images/avatar/cara2_claro.png'),
      require('../../assets/images/avatar/cara3_claro.png'),
    ],
    [
      require('../../assets/images/avatar/cara1_oscuro.png'),
      require('../../assets/images/avatar/cara2_oscuro.png'),
      require('../../assets/images/avatar/cara3_oscuro.png'),
    ],
  ];

  const camisetas = [
    [
      require('../../assets/images/avatar/camiseta1_claro.png'),
      require('../../assets/images/avatar/camiseta2_claro.png'),
    ],
    [
      require('../../assets/images/avatar/camiseta1_oscuro.png'),
      require('../../assets/images/avatar/camiseta2_oscuro.png'),
    ],
  ];

  const peloCortoOptions = [
    require('../../assets/images/avatar/pelo1.png'),
    require('../../assets/images/avatar/pelo3.png'),
  ];

  const peloLargoOptions = [
    require('../../assets/images/avatar/pelo5.png'),
    require('../../assets/images/avatar/pelo6.png'),
  ];

  const colorPeloSeguro = COLORES_PELO[colorPelo] ?? COLORES_PELO[0];

  // ── Avatar preview ────────────────────────────────────────────────────────
  const AvatarPreview = ({ size = 290 }: { size?: number }) => (
    <View style={{ width: size, height: size * 1.2, position: 'relative' }}>
      {/* Camiseta */}
      <Image
        source={camisetas[si][shirt] ?? camisetas[0][0]}
        style={{ position: 'absolute', top: size * 0.70, left: -size * 0.12,
          width: size * 1.3, height: size * 1.3, zIndex: 3 }}
        resizeMode="contain"
      />
      {/* Cara */}
      <Image
        source={caras[si][cara] ?? caras[0][0]}
        style={{ position: 'absolute', top: -size * 0.02, left: 0,
          width: size, height: size, zIndex: 1 }}
        resizeMode="contain"
      />
      {/* Pelo corto */}
      {peloCorto >= 0 && peloCortoOptions[peloCorto] && (
        <Image
          source={peloCortoOptions[peloCorto]}
          style={{ position: 'absolute', top: -size * 0.28, left: size * -0.02,
            width: size * 1.05, height: size * 0.8, zIndex: 4,
            tintColor: colorPeloSeguro }}
          resizeMode="contain"
        />
      )}
      {/* Pelo largo */}
      {peloCorto < 0 && peloLargo >= 0 && peloLargoOptions[peloLargo] && (
        <Image
          source={peloLargoOptions[peloLargo]}
          style={{ position: 'absolute', top: -size * 0.22, left: 0,
            width: size * 1.05, height: size * 1.05, zIndex: 4,
            tintColor: colorPeloSeguro }}
          resizeMode="contain"
        />
      )}
    </View>
  );

  // ── Panel de opciones según tab ────────────────────────────────────────────
  const renderOpciones = () => {
    switch (tabActivo) {

      case 'piel':
        return (
          <>
            <Text style={s.opcionTitulo}>Tono de piel</Text>
            <View style={s.gridColores}>
              {TONOS_PIEL.map((color, i) => (
                <Pressable
                  key={i}
                  onPress={() => updateAvatar('tonoPiel', i)}
                  style={[s.circleColor, { backgroundColor: color },
                    tonoPiel === i && s.circleSelected]}
                />
              ))}
            </View>
          </>
        );

      case 'cara':
        return (
          <>
            <Text style={s.opcionTitulo}>Cara</Text>
            <View style={s.gridImagenes}>
              {caras[si].map((img, i) => (
                <Pressable
                  key={i}
                  onPress={() => updateAvatar('cara', i)}
                  style={[s.imgCard, cara === i && s.imgCardSelected]}
                >
                  <Image source={img} style={s.imgCardImg} resizeMode="contain" />
                </Pressable>
              ))}
            </View>
          </>
        );

      case 'pelo':
        return (
          <>
            <Text style={s.opcionTitulo}>Pelo corto</Text>
            <View style={s.gridImagenes}>
              {peloCortoOptions.map((img, i) => (
                <Pressable
                  key={i}
                  onPress={() => { updateAvatar('peloCorto', i); updateAvatar('peloLargo', -1); }}
                  style={[s.imgCard, peloCorto === i && s.imgCardSelected]}
                >
                  <Image source={img} style={[s.imgCardImg, { tintColor: colorPeloSeguro }]} resizeMode="contain" />
                </Pressable>
              ))}
            </View>
            <Text style={[s.opcionTitulo, { marginTop: 20 }]}>Pelo largo</Text>
            <View style={s.gridImagenes}>
              {peloLargoOptions.map((img, i) => (
                <Pressable
                  key={i}
                  onPress={() => { updateAvatar('peloLargo', i); updateAvatar('peloCorto', -1); }}
                  style={[s.imgCard, peloLargo === i && s.imgCardSelected]}
                >
                  <Image source={img} style={[s.imgCardImg, { tintColor: colorPeloSeguro }]} resizeMode="contain" />
                </Pressable>
              ))}
            </View>
          </>
        );

      case 'colorPelo':
        return (
          <>
            <Text style={s.opcionTitulo}>Color de pelo</Text>
            <View style={s.gridColores}>
              {COLORES_PELO.map((color, i) => (
                <Pressable
                  key={i}
                  onPress={() => updateAvatar('colorPelo', i)}
                  style={[s.circleColor, { backgroundColor: color },
                    colorPelo === i && s.circleSelected]}
                />
              ))}
            </View>
          </>
        );

      case 'camiseta':
        return (
          <>
            <Text style={s.opcionTitulo}>Camiseta</Text>
            <View style={s.gridImagenes}>
              {camisetas[si].map((img, i) => (
                <Pressable
                  key={i}
                  onPress={() => updateAvatar('shirt', i)}
                  style={[s.imgCard, shirt === i && s.imgCardSelected]}
                >
                  <Image source={img} style={s.imgCardImg} resizeMode="contain" />
                </Pressable>
              ))}
            </View>
          </>
        );

      default: return null;
    }
  };

  // ── Tabs ──────────────────────────────────────────────────────────────────
  const TabBar = () => (
    <View style={s.tabBar}>
      {TABS.map(tab => (
        <Pressable
          key={tab.id}
          onPress={() => setTabActivo(tab.id)}
          style={[s.tabBtn, tabActivo === tab.id && s.tabBtnActive]}
        >
          <Text style={[s.tabEmoji, tabActivo === tab.id && { opacity: 1 }]}>
            <MaterialCommunityIcons
              name={tab.icon as any}
              size={24}
            />
          </Text>
          {tabActivo === tab.id && (
            <View style={s.tabActiveLine} />
          )}
        </Pressable>
      ))}
    </View>
  );

  if (isTablet) {
    return (
      <View style={s.rootTablet}>
        <View style={s.leftPanel}>
          <View style={s.avatarBgTablet}>
            <AvatarPreview size={220} />
          </View>
        </View>
        <View style={s.rightPanel}>
          <TabBar />
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={s.opcionesScroll}
          >
            {renderOpciones()}
          </ScrollView>
        </View>
      </View>
    );
  }

  return (
    <View style={s.rootMobile}>
      <View style={s.avatarBgMobile}>
        <AvatarPreview size={180}  />
      </View>
      <View style={s.bottomPanel}>
        <TabBar />
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={s.opcionesScroll}
          keyboardShouldPersistTaps="handled"
        >
          {renderOpciones()}
        </ScrollView>
      </View>
    </View>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  rootTablet: {
    flex: 1, flexDirection: 'row', backgroundColor: '#fff', borderColor: '#EEE', borderWidth: 2, borderRadius: 14, overflow: 'hidden',
    width: 700, height: 500, alignSelf: 'center', marginTop: 40,
  },
  leftPanel: {
    width: 320, backgroundColor: PURPLE,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarBgTablet: {
    width: 280, height: 320,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarHint: {
    fontSize: 13, color: '#AAA', marginTop: 12, fontWeight: '600',
  },
  rightPanel: {
    flex: 1, backgroundColor: '#fff',
  },
  rootMobile: {
    flex: 1, backgroundColor: '#fff'
  },
  avatarBgMobile: {
   width: '100%', height: 500,backgroundColor: PURPLE, marginTop: -80,
  paddingBottom: 20, justifyContent: 'center',  alignItems: 'center',
    
  },
  bottomPanel: {
    flex: 1, backgroundColor: '#fff',
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1.5, borderBottomColor: '#EEE',
    backgroundColor: '#fff',
  },
  tabBtn: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingVertical: 12, position: 'relative', opacity: .45,
  },
  tabBtnActive: { opacity: 1 },
  tabEmoji:     { fontSize: 22 },
  tabActiveLine: {
    position: 'absolute', bottom: 0, left: 8, right: 8,
    height: 3, borderRadius: 2, backgroundColor: PURPLE,
  },
  opcionesScroll: {
    padding: 20, paddingBottom: 40,
  },
  opcionTitulo: {
    fontSize: 16, fontWeight: '700', color: '#333', marginBottom: 14,
  },
  gridColores: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 10,
  },
  circleColor: {
    width: 48, height: 48, borderRadius: 24,
    borderWidth: 2, borderColor: '#DDD',
  },
  circleSelected: {
    borderWidth: 4, borderColor: PURPLE,
    shadowColor: PURPLE, shadowOpacity: .4, shadowRadius: 6, elevation: 4,
  },
  gridImagenes: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 10,
  },
  imgCard: {
    width: 88, height: 88, borderRadius: 14,
    borderWidth: 2, borderColor: '#E5E5E5',
    backgroundColor: '#FAFAFA',
    alignItems: 'center', justifyContent: 'center',
    padding: 6,
  },
  imgCardSelected: {
    borderColor: PURPLE, borderWidth: 3,
    backgroundColor: '#F0E8F8',
    shadowColor: PURPLE, shadowOpacity: .3, shadowRadius: 6, elevation: 4,
  },
  imgCardImg: {
    width: 72, height: 72,
  },
});
