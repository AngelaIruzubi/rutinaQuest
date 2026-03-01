import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import React, { useState } from 'react';
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

export default function Home() {

  const [modalVisible, setModalVisible] = useState(false);
  const [taskModalVisible, setTaskModalVisible] = useState(false);

  const [newTask, setNewTask] = useState('');
  const [search, setSearch] = useState('');

  const [selectedTask, setSelectedTask] = useState<any>(null);

  const [tasks, setTasks] = useState([
    { id: '1', title: 'Hacer la cama', hora: '08:00', completed: false },
    { id: '2', title: 'Lavar los platos', hora: '12:30', completed: false },
    { id: '3', title: 'Sacar la basura', hora: '18:00', completed: false },
  ]);

  const [showPicker, setShowPicker] = useState(false);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [tempTime, setTempTime] = useState(new Date());

  const filteredTasks = tasks.filter(task =>
    task.title.toLowerCase().includes(search.toLowerCase())
  );

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
  const today = new Date();

const weekday = today.toLocaleDateString('es-ES', { weekday: 'long' });
const day = today.getDate();
const month = today.toLocaleDateString('es-ES', { month: 'long' });
const year = today.getFullYear();

const capitalize = (text: string) =>
  text.charAt(0).toUpperCase() + text.slice(1);

const formattedToday = `${capitalize(weekday)}, ${day} de ${capitalize(month)} de ${year}`;
  
    return (
      <View style={{
        flex: 1,
        backgroundColor: '#ffffff',
        paddingTop: 60,
        paddingHorizontal: 20,
      }}>


      <View style={{
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 40,
      }}>
        <Text style={{
          fontSize: 36,
          fontWeight: '600',
          color: '#A77BBE',
          marginRight: 10,
        }}>
          Mis Tareas
        </Text>

        <Ionicons style={{

          marginTop: 10,
        }} name="list" size={28} color="#A77BBE" />
      </View>

      <View style={{
        flexDirection: 'row',
        justifyContent: 'flex-start',
        alignItems: 'center',
        marginBottom: 40,
      }}>
           <Text style={{
              textAlign: 'left',
              color: '#888',
              marginTop: -25,
              fontSize: 20
            }}>
              {formattedToday}
            </Text>

      </View>


  
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
          placeholderTextColor="#999"
          value={search}
          onChangeText={setSearch}
          style={{ flex: 1, fontSize: 16 }}
        />
        <Ionicons name="search" size={20} color="#999" />
      </View>

      
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
              elevation: 2,
            }}>
              <Text style={{
                fontSize: 17,
                color: '#333',
                textDecorationLine: item.completed ? 'line-through' : 'none'
              }}>
                {item.title}
              </Text>

              <Text style={{ color: '#555' }}>
                {item.hora}
              </Text>
            </View>
          </Pressable>
        )}
      />


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
          elevation: 5,
        }}
      >
        <Ionicons name="add" size={36} color="#FFF" />
      </Pressable>


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

              <Pressable
                onPress={() => setModalVisible(false)}
                style={{ alignSelf: 'flex-start' }}
              >
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
                  value={newTask}
                  onChangeText={setNewTask}
                  style={{ flex: 1, paddingVertical: 10 }}
                />

                <Pressable onPress={() => setShowPicker(true)}>
                  <Ionicons name="calendar-outline" size={22} color="#A77BBE" />
                </Pressable>
              </View>

              <Text style={{
                marginTop: 10,
                textAlign: 'center',
                color: '#555'
              }}>
                {selectedTime
                  ? `Hora seleccionada: ${selectedTime}`
                  : "No has elegido hora"}
              </Text>

              {showPicker && (
                <DateTimePicker
                  value={tempTime}
                  mode="time"
                  is24Hour={true}
                  display={Platform.OS === "ios" ? "spinner" : "default"}
                  onChange={handleTimeChange}
                />
              )}

              <View style={{
                justifyContent: 'center',
                alignItems: 'center',
                marginTop: 30,
              }}>
                <Image
                  source={require("../../assets/images/cine.png")}
                  style={{ width: 180, height: 180 }}
                  resizeMode="contain"
                />
              </View>

              <Pressable
                onPress={() => {
                  if (newTask.trim() !== '') {
                    setTasks(prev => [
                      ...prev,
                      {
                        id: Date.now().toString(),
                        title: newTask,
                        hora: selectedTime ?? "Sin hora",
                        completed: false
                      }
                    ]);

                    setNewTask('');
                    setSelectedTime(null);
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
                <Text style={{
                  fontSize: 22,
                  color: '#A77BBE',
                  fontWeight: '600'
                }}>
                  Añadir ✓
                </Text>
              </Pressable>

            </ScrollView>
          </View>
        </View>
      </Modal>

   
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
            alignItems: 'center'
          }}>

            <Pressable
              onPress={() => setTaskModalVisible(false)}
              style={{ position: 'absolute', left: 15, top: 15 }}
            >
              <Ionicons name="close" size={26} color="#A77BBE" />
            </Pressable>

            <Text style={{
              fontSize: 20,
              marginBottom: 20,
              marginTop: 20
            }}>
              {selectedTask?.title}
            </Text>

            <Image
              source={require("../../assets/images/cine.png")}
              style={{ width: 150, height: 150 }}
              resizeMode="contain"
            />

            <Pressable
              onPress={() => {
                  setTasks(prev =>
                    prev.filter(task => task.id !== selectedTask.id)
                  );

                  setTaskModalVisible(false);
                }}
                style={{
                marginTop: 30,
                backgroundColor: '#E5D9EE',
                padding: 15,
                borderRadius: 15,
                width: '100%',
                alignItems: 'center'
              }}
            >
              <Text style={{
                fontSize: 20,
                color: '#A77BBE',
                fontWeight: '600'
              }}>
                Realizada ✓
              </Text>
            </Pressable>

          </View>
        </View>
      </Modal>

    </View>
  );
}





