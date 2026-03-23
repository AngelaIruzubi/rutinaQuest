import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useEffect, useState } from 'react';
import {
  FlatList,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View
} from 'react-native';
import { deleteTarea, getTareas, initDB, insertTarea } from '../../database/database';
import { buscarPictograma } from "../../services/arasaac";

export default function Home() {

  // ===== STATES =====
  const [modalVisible, setModalVisible] = useState(false);
  const [taskModalVisible, setTaskModalVisible] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [showPicker, setShowPicker] = useState(false);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [tempTime] = useState(new Date());
  const [titulo, setTitulo] = useState("");
  const [pictogramId, setPictogramId] = useState<number | null>(null);

  // ===== CARGAR TAREAS =====
  useEffect(() => {
    initDB();
    const rows = getTareas();
    setTasks(rows.map((r: any) => ({ ...r, completed: r.completed === 1 })));
  }, []);

  // ===== BUSCAR PICTOGRAMA =====
  const buscarImagen = async (texto: string) => {
    setTitulo(texto);
    const id = await buscarPictograma(texto);
    console.log("ID pictograma:", id);
    if (id) setPictogramId(id);
  };

  // ===== DATE =====
  const handleTimeChange = (event: any, date?: Date) => {
    if (date) {
      const formatted = date.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      });
      setSelectedTime(formatted);
    }
    setShowPicker(false);
  };

  // ===== TODAY FORMAT =====
  const today = new Date();
  const weekday = today.toLocaleDateString('es-ES', { weekday: 'long' });
  const day = today.getDate();
  const month = today.toLocaleDateString('es-ES', { month: 'long' });
  const year = today.getFullYear();
  const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);
  const formattedToday = `${capitalize(weekday)}, ${day} de ${capitalize(month)} de ${year}`;

  const filteredTasks = tasks.filter(task =>
    task.title.toLowerCase().includes(search.toLowerCase())
  );

  // ===== UI =====
  return (
    <View style={{
      flex: 1,
      backgroundColor: '#ffffff',
      paddingTop: 60,
      paddingHorizontal: 20,
    }}>

      <Text style={{
        fontSize: 36,
        fontWeight: '600',
        color: '#A77BBE',
        textAlign: 'center',
        marginBottom: 20,
      }}>
        Mis Tareas
      </Text>

      <Text style={{
        textAlign: 'center',
        color: '#888',
        marginBottom: 30,
        fontSize: 20,
      }}>
        {formattedToday}
      </Text>

      {/* SEARCH */}
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f3f2f2',
        borderRadius: 25,
        paddingHorizontal: 15,
        paddingVertical: 10,
        marginBottom: 40,
      }}>
        <TextInput
          placeholder="Buscar..."
          value={search}
          onChangeText={setSearch}
          style={{ flex: 1, fontSize: 16 }}
        />
        <Ionicons name="search" size={20} color="#999" />
      </View>

      {/* LIST */}
      <FlatList
        data={filteredTasks}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 120 }}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => {
              setSelectedTask(item);
              setTaskModalVisible(true);
            }}
          >
            <View style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: item.completed ? '#DFF5E1' : '#f3f2f2',
              padding: 18,
              borderRadius: 15,
              marginBottom: 15,
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>

                {item.pictogramId && (
                  <Image
                    source={{
                      uri: `https://static.arasaac.org/pictograms/${item.pictogramId}/${item.pictogramId}_300.png`
                    }}
                    style={{ width: 40, height: 40, marginRight: 10 }}
                  />
                )}

                <Text style={{
                  fontSize: 17,
                  textDecorationLine: item.completed ? 'line-through' : 'none'
                }}>
                  {item.title}
                </Text>

              </View>
              <Text>{item.hora}</Text>
            </View>
          </Pressable>
        )}
      />

      {/* BOTON AGREGAR */}
      <Pressable
        onPress={() => setModalVisible(true)}
        style={{
          position: 'absolute',
          bottom: 30,
          right: 25,
          backgroundColor: '#A77BBE',
          width: 70,
          height: 70,
          borderRadius: 35,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <Ionicons name="add" size={36} color="#FFF" />
      </Pressable>

      {/* MODAL ADD TASK */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.3)',
          justifyContent: 'center',
          alignItems: 'center',
        }}>
          <View style={{
            backgroundColor: '#F4F0F6',
            borderRadius: 20,
            padding: 20,
            width: '85%',
          }}>
            <ScrollView>

              <Pressable onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={28} color="#A77BBE" />
              </Pressable>

              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginTop: 20,
                borderWidth: 1,
                borderColor: '#DDD',
                borderRadius: 10,
                paddingHorizontal: 10,
              }}>
                <TextInput
                  placeholder="Escribe tu tarea..."
                  value={titulo}
                  onChangeText={buscarImagen}
                  style={{ flex: 1, paddingVertical: 10 }}
                />
                <Pressable onPress={() => setShowPicker(true)}>
                  <Ionicons name="calendar-outline" size={22} color="#A77BBE" />
                </Pressable>
              </View>

              <Text style={{ marginTop: 10, textAlign: 'center' }}>
                {selectedTime ? `Hora seleccionada: ${selectedTime}` : "No has elegido hora"}
              </Text>

              {/* DateTimePicker solo en móvil */}
              {showPicker && Platform.OS !== 'web' && (
                <DateTimePicker
                  value={tempTime}
                  mode="time"
                  is24Hour
                  display={Platform.OS === "ios" ? "spinner" : "default"}
                  onChange={handleTimeChange}
                />
              )}

              {/* Selector de hora manual en web */}
              {showPicker && Platform.OS === 'web' && (
                <input
                  type="time"
                  onChange={(e) => {
                    setSelectedTime(e.target.value);
                    setShowPicker(false);
                  }}
                  style={{ marginTop: 10, padding: 8, fontSize: 16 }}
                />
              )}

              {/* PICTOGRAMA */}
              <View style={{ justifyContent: 'center', alignItems: 'center', marginTop: 30 }}>
                {pictogramId && (
                  <Image
                    source={{
                      uri: `https://static.arasaac.org/pictograms/${pictogramId}/${pictogramId}_300.png`
                    }}
                    style={{ width: 120, height: 120 }}
                  />
                )}
              </View>

              <Pressable
                onPress={() => {
                  if (titulo.trim() !== '') {
                    const newTask = {
                      id: Date.now().toString(),
                      title: titulo,
                      pictogramId: pictogramId ?? null,
                      hora: selectedTime ?? 'Sin hora',
                      completed: false,
                    };
                    insertTarea(newTask);
                    setTasks(prev => [...prev, newTask]);
                    setTitulo('');
                    setSelectedTime(null);
                    setPictogramId(null);
                    setModalVisible(false);
                  }
                }}
                style={{
                  backgroundColor: '#E5D9EE',
                  padding: 15,
                  borderRadius: 15,
                  alignItems: 'center',
                  marginTop: 30,
                }}
              >
                <Text style={{ fontSize: 22, color: '#A77BBE', fontWeight: '600' }}>
                  Añadir ✓
                </Text>
              </Pressable>

            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* TASK DETAIL MODAL */}
      <Modal visible={taskModalVisible} transparent animationType="slide">
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.3)',
          justifyContent: 'center',
          alignItems: 'center',
        }}>
          <View style={{
            backgroundColor: '#F4F0F6',
            borderRadius: 20,
            padding: 25,
            width: '85%',
            alignItems: 'center',
          }}>

            <Pressable
              onPress={() => setTaskModalVisible(false)}
              style={{ position: 'absolute', left: 15, top: 15 }}
            >
              <Ionicons name="close" size={26} color="#A77BBE" />
            </Pressable>

            <Text style={{ fontSize: 20, marginBottom: 20, marginTop: 20 }}>
              {selectedTask?.title}
            </Text>

            {selectedTask?.pictogramId && (
              <Image
                source={{
                  uri: `https://static.arasaac.org/pictograms/${selectedTask.pictogramId}/${selectedTask.pictogramId}_300.png`
                }}
                style={{ width: 150, height: 150, marginBottom: 20 }}
              />
            )}

            <Pressable
              onPress={() => {
                deleteTarea(selectedTask?.id);
                setTasks(prev => prev.filter(task => task.id !== selectedTask?.id));
                setTaskModalVisible(false);
              }}
              style={{
                marginTop: 30,
                backgroundColor: '#E5D9EE',
                padding: 15,
                borderRadius: 15,
                width: '100%',
                alignItems: 'center',
              }}
            >
              <Text style={{ fontSize: 20, color: '#A77BBE', fontWeight: '600' }}>
                Realizada ✓
              </Text>
            </Pressable>

          </View>
        </View>
      </Modal>

    </View>
  );
}



