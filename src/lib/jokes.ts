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
  { setup: '¿Cuántos niños rubios hacen falta para cambiar una ampolleta?', punchline: '¡Ninguno, la oscuridad les hace bien!' },
  { setup: '¿Por qué el tomate es tan rojo?', punchline: '¡Porque vio a la ensalada sin ropa!' },
  { setup: '¿Qué le dijo el mar a la playa?', punchline: '¡Nada, solo la saludó con una ola!' },
  { setup: '¿Cómo se llama el detective más pequeño del mundo?', punchline: 'Sherlock Gnomes.' },
  { setup: '¿Por qué los astronautas no pueden ser buenos contadores?', punchline: 'Porque se pierden en el espacio.' },
  { setup: '¿Qué le dice un techo a otro techo?', punchline: '¡Nada, los techos no hablan, po!' },
  { setup: '¿Por qué el computador fue al médico?', punchline: 'Porque tenía un virus.' },
  { setup: '¿Cómo se llama el baile de los científicos?', punchline: '¡El ADN-ce!' },
  { setup: '¿Qué le dijo el semáforo al auto?', punchline: '¡No me mires que me estoy cambiando!' },
  { setup: '¿Cuál es el colmo de un jardinero?', punchline: 'Que su mujer lo deje plantado.' },
  { setup: '¿Por qué la escoba está contenta?', punchline: 'Porque encontró su media naranja… ¡una fregona!' },
]

let lastIndex = -1

export function getRandomJoke() {
  let idx
  do { idx = Math.floor(Math.random() * jokes.length) } while (idx === lastIndex)
  lastIndex = idx
  return jokes[idx]
}
