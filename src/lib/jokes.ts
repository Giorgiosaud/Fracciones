const jokes = [
  { setup: '¿Por qué el libro de matemáticas está triste?', punchline: '¡Porque tiene muchos problemas!' },
  { setup: '¿Qué le dijo el cero al ocho?', punchline: '¡Bonito cinturón!' },
  { setup: '¿Cómo se llama el campeón de buceo de Alemania?', punchline: 'Hans Abajo.' },
  { setup: '¿Qué hace una abeja en el gimnasio?', punchline: '¡Zum-ba!' },
  { setup: '¿Por qué los pájaros no usan Facebook?', punchline: 'Porque ya tienen Twitter.' },
  { setup: '¿Cómo se llama el perro sin patas?', punchline: 'Da igual, igual no va a venir.' },
  { setup: '¿Qué le dijo una iguana a su hermana gemela?', punchline: '¡Somos iguanitas!' },
  { setup: '¿Cómo se dice pañuelo en japonés?', punchline: 'Saka-moko.' },
  { setup: '¿Qué hace un dinosaurio con un vaso de leche?', punchline: '¡Leche-sauro!' },
  { setup: '¿Qué le dijo un genio a otro genio?', punchline: '¡Genio-al verte!' },
  { setup: '¿Por qué el tomate se puso rojo?', punchline: '¡Porque le ganó una carrera a la lechuga!' },
  { setup: '¿Qué le dijo el mar a la playa?', punchline: '¡Nada, solo la saludó con una ola!' },
  { setup: '¿Cómo se llama el detective más pequeño del mundo?', punchline: 'Sherlock Gnomes.' },
  { setup: '¿Por qué los astronautas no pueden ser buenos contadores?', punchline: 'Porque se pierden en el espacio.' },
  { setup: '¿Qué le dice un techo a otro techo?', punchline: '¡Nada, los techos no hablan, po!' },
  { setup: '¿Por qué el computador fue al médico?', punchline: 'Porque tenía un virus.' },
  { setup: '¿Cómo se llama el baile de los científicos?', punchline: '¡El ADN-ce!' },
  { setup: '¿Qué le dijo el semáforo al auto?', punchline: '¡No me mires que me estoy cambiando!' },
  { setup: '¿Cuál es el colmo de un jardinero?', punchline: 'Que su mujer lo deje plantado.' },
  { setup: '¿Por qué la escoba está contenta?', punchline: 'Porque encontró su media naranja… ¡una fregona!' },
  { setup: '¿Por qué las cigüeñas encogen una pata para dormir?', punchline: 'Porque si encogen las dos se caerían.' },
  { setup: '¿Sabes en qué se parece una niña y un tren?', punchline: 'Que la niña tiene trenzas y el tren… ¡zas! y se metió en el túnel.' },
  { setup: '¿Por qué no se le puede contar un secreto a un esqueleto?', punchline: 'Porque le entra por un oído y le sale por el otro.' },
  { setup: '¿Cuál es el colmo de un ladrón?', punchline: 'Llamarse Esteban Dido.' },
  { setup: 'Había una vez un hombre tan pequeño que se subió encima de una canica, ¿sabes qué dijo?', punchline: '¡El mundo es mío!' },
  { setup: '¿Por qué el maestro de música necesita una escalera?', punchline: 'Para alcanzar las notas altas.' },
  { setup: '¿Cuáles son las 3 letras que asustan a los ladrones?', punchline: 'T-V-O.' },
  { setup: '¿Por qué el televisor cruzó la carretera?', punchline: 'Porque quería ser pantalla plana.' },
  { setup: '¿Cuál animal puede saltar más alto que una casa?', punchline: 'Cualquiera, porque las casas no saltan.' },
  { setup: '¿Cómo estornuda un tomate?', punchline: '¡Keeeétchup!' },
  { setup: '¿Cuál es el baile favorito del tomate?', punchline: 'La salsa.' },
  { setup: '¿Dónde cuelga Superman su supercapa?', punchline: 'En el superchero.' },
  { setup: '¿Cómo se llama el campeón de las escondidas?', punchline: 'No se sabe, aún no lo han encontrado.' },
]

let lastIndex = -1

export function getRandomJoke() {
  let idx
  do { idx = Math.floor(Math.random() * jokes.length) } while (idx === lastIndex)
  lastIndex = idx
  return jokes[idx]
}
