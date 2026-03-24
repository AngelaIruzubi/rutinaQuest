import {
  Image, Pressable, ScrollView,
  Text, useWindowDimensions, View,
} from 'react-native';
import { useAvatar } from '../../context/AvatarContext';

const TONOS_PIEL  = ['#F5C89A', '#A0522D'];
const COLORES_PELO  = ['#1a1a1a', '#8B4513', '#DAA520', '#E8E8E8'];

export default function Perfil() {
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const { avatar, updateAvatar } = useAvatar();
  const { tonoPiel, cara, ojos, colorPelo, peloCorto, peloLargo, shirt } = avatar;

  const avatarConfig = {
    cara:      { top: -90, left: 0,   zIndex: 1, scale: 1 },
    peloCorto: { top: -145, left: 15,  scale: 1.05, zIndex: 2 },
    peloLargo: { top: -140, left: 0,   scale: 1.05, zIndex: 2 },
    shirt:     { top: 85,   left: -40, scale: 1,    zIndex: 5 },
  };

  // Assets — cara y camiseta según tonoPiel
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

  // ── Componentes ────────────────────────────────────────

  const SectionTitle = ({ label }: { label: string }) => (
    <Text style={{
      fontSize: 18, fontWeight: '800', color: '#A77BBE',
      marginBottom: 12, marginTop: 24, alignSelf: 'center',
    }}>
      {label}
    </Text>
  );

  // Selector de círculos de color
  const ColorSelector = ({ colors, selected, field }: {
    colors: string[], selected: number, field: keyof typeof avatar
  }) => (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' }}>
      {colors.map((color, index) => (
        <Pressable
          key={index}
          onPress={() => updateAvatar(field, index)}
          style={{
            width: 40, height: 40, borderRadius: 20,
            backgroundColor: color, margin: 6,
            borderWidth: selected === index ? 4 : 1.5,
            borderColor: selected === index ? '#A77BBE' : '#DDD',
          }}
        />
      ))}
    </View>
  );

  // Selector de imágenes horizontal con tintColor opcional
  const ImageSelector = ({ options, selected, field, tint }: {
    options: any[], selected: number,
    field: keyof typeof avatar, tint?: string
  }) => (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 4 }}>
      {options.map((img, index) => (
        <Pressable
          key={index}
          onPress={() => {
            if (field === 'peloCorto') {
              updateAvatar('peloCorto', index);
              updateAvatar('peloLargo', -1);
            } else if (field === 'peloLargo') {
              updateAvatar('peloLargo', index);
              updateAvatar('peloCorto', -1);
            } else {
              updateAvatar(field, index);
            }
          }}
          style={{
            marginRight: 12,
            borderWidth: selected === index ? 4 : 1.5,
            borderColor: selected === index ? '#A77BBE' : '#DDD',
            borderRadius: 14, padding: 6,
            backgroundColor: '#FAFAFA',
          }}
        >
          <Image
            source={img}
            style={{ width: 64, height: 64, tintColor: tint }}
            resizeMode="contain"
          />
        </Pressable>
      ))}
    </ScrollView>
  );

  // ── Render ─────────────────────────────────────────────
  return (
    <ScrollView contentContainerStyle={{
      padding: 20, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center',
     
    }}>
      <Text style={{
        fontSize: 32, marginBottom: 4,
        color: '#A77BBE', fontWeight: 'bold', textAlign: 'center',
      }}>
        Tu Avatar
      </Text>
      <Text style={{
        fontSize: 14, color: '#BBB', marginBottom: 20, textAlign: 'center'
      }}>
        Personalízalo a tu gusto
      </Text>

      <View style={{
        width: '100%',
        backgroundColor: '#F9F9F9',
        borderRadius: 20,
        flexDirection: isTablet ? 'row' : 'column',
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 20,
        paddingHorizontal: 0,
        gap: 40,
      }}>

      {/* ── AVATAR PREVIEW ── */}
      <View style={{
        width: isTablet ? 260 : 180,
        height: isTablet ? 260 : 180,
        marginBottom: 80, marginTop: 150,
        marginLeft: 40,
        alignItems: 'center', justifyContent: 'center' ,
      }}>
        <View style={{
          width: 260, height: 260,
          transform: [{ scale: isTablet ? 1 : 0.7 }],
        }}>

          {/* CAMISETA */}
          <Image
            source={camisetas[tonoPiel][shirt]}
            style={{
              position: 'absolute',
              top: avatarConfig.shirt.top,
              left: avatarConfig.shirt.left,
              transform: [{ scale: avatarConfig.shirt.scale }],
              zIndex: avatarConfig.shirt.zIndex,
            }}
            resizeMode="contain"
          />

          {/* CARA */}
          <Image
            source={caras[tonoPiel][cara]}
            style={{
              position: 'absolute',
              top: avatarConfig.cara.top,
              left: avatarConfig.cara.left,
              transform: [{ scale: avatarConfig.cara.scale }],
              zIndex: avatarConfig.cara.zIndex,
            }}
            resizeMode="contain"
          />

          {/* PELO CORTO */}
          {peloCorto >= 0 && (
            <Image
              source={peloCortoOptions[peloCorto]}
              style={{
                position: 'absolute',
                top: avatarConfig.peloCorto.top,
                left: avatarConfig.peloCorto.left,
                transform: [{ scale: avatarConfig.peloCorto.scale }],
                zIndex: avatarConfig.peloCorto.zIndex,
                tintColor: COLORES_PELO[colorPelo],
              }}
              resizeMode="contain"
            />
          )}

          {/* PELO LARGO */}
          {peloCorto < 0 && peloLargo >= 0 && (
            <Image
              source={peloLargoOptions[peloLargo]}
              style={{
                position: 'absolute',
                top: avatarConfig.peloLargo.top,
                left: avatarConfig.peloLargo.left,
                transform: [{ scale: avatarConfig.peloLargo.scale }],
                zIndex: avatarConfig.peloLargo.zIndex,
                tintColor: COLORES_PELO[colorPelo],
              }}
              resizeMode="contain"
            />
          )}
        </View>
      </View>
         <View style={{
          flex: 1,
          maxWidth: isTablet ? 500 : '100%',
          alignSelf: 'stretch',
        }}>
      {/* ── SECCIÓN: TONO DE PIEL ── */}
      <SectionTitle label="🎨 Tono de piel" />
      <View style={{ flexDirection: 'row', gap: 20, marginBottom: 8, justifyContent: 'center', alignItems: 'center', }}>
        {TONOS_PIEL.map((color, index) => (
          <Pressable
            key={index}
            onPress={() => updateAvatar('tonoPiel', index)}
            style={{
              width: 52, height: 52, borderRadius: 26,
              backgroundColor: color,
              borderWidth: tonoPiel === index ? 4 : 1.5,
              borderColor: tonoPiel === index ? '#A77BBE' : '#DDD',
            }}
          />
        ))}
      </View>

      {/* ── SECCIÓN: CARA ── */}
      <View style={{
        alignSelf: 'center', height: 140,

      }}>
      <SectionTitle label="😊 Cara" />
      <ImageSelector
        options={caras[tonoPiel]}
        selected={cara}
        field="cara"
      />
      </View>
     

      {/* ── SECCIÓN: PELO ── */}
      <View style={{
        alignSelf: 'center', height: 140,
      }}>
      <SectionTitle label="💇 Pelo corto"  />
      <ImageSelector 
        
        options={peloCortoOptions}
        selected={peloCorto}
        field="peloCorto"
        tint={COLORES_PELO[colorPelo]}
      />
      </View>

      {/* ── SECCIÓN: PELO ── */}
      <View style={{
        alignSelf: 'center', height: 140,
      }}>
      <SectionTitle label="💁 Pelo largo" />
      <ImageSelector
        options={peloLargoOptions}
        selected={peloLargo}
        field="peloLargo"
        tint={COLORES_PELO[colorPelo]}
      />
      </View>

      {/* ── SECCIÓN: COLOR PELO ── */}
      <View style={{
        alignSelf: 'center', 
      }}>
      <SectionTitle label="🎨 Color de pelo" />
      <ColorSelector colors={COLORES_PELO} selected={colorPelo} field="colorPelo" />
      </View>

      {/* ── SECCIÓN: CAMISETA ── */}
      <View style={{
        alignSelf: 'center', height: 140,
       
      }}>
      <SectionTitle label="👕 Camiseta" />
      <ImageSelector
        options={camisetas[tonoPiel]}
        selected={shirt}
        field="shirt"
      />
      </View>
      </View>
      
    </View>
    </ScrollView>
    

  );
}