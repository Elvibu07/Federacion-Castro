# Especificación de Requisitos del Sistema (SRS)

## Automatización web del sistema de grados de la Federación Madrileña de Karate y D.A.

**Versión:** 1.0  
**Fecha:** 12/06/2026  
**Documento base:** Normativa de Grados F.M.K. y D.A., aprobada en Comisión Delegada el 04/07/2017  
**Formato:** Markdown

---

## 1. Introducción

### 1.1 Propósito

Este documento define la Especificación de Requisitos del Sistema (SRS) para una página web destinada a automatizar la gestión de grados de la Federación Madrileña de Karate y Disciplinas Asociadas (F.M.K. y D.A.).

El sistema permitirá administrar aspirantes, solicitudes de examen, requisitos administrativos, documentación, tribunales, jueces, resultados, actas oficiales, exenciones, convalidaciones y situaciones especiales conforme a la normativa federativa de grados.

### 1.2 Alcance

La solución será una aplicación web institucional que centralice el proceso completo de gestión de exámenes de grado, desde la inscripción del aspirante hasta la emisión del acta oficial.

El sistema cubrirá:

- Registro y gestión de aspirantes.
- Validación de edad mínima, permanencia entre grados y licencias.
- Carga y revisión de documentación obligatoria.
- Gestión de convocatorias de examen.
- Configuración de tribunales, jueces y árbitros auxiliares.
- Evaluación de bloque común y bloque específico.
- Gestión de vías de examen: Kumite, Campeonatos y Técnica.
- Registro de calificaciones Apto y No Apto.
- Generación de actas, listados, informes y notificaciones.
- Gestión de repetidores, suspensos parciales, reducciones y exenciones de cuota.
- Gestión de dispensa médica, convalidación, méritos deportivos y reconocimiento de altos grados.

### 1.3 Definiciones

| Término | Definición |
|---|---|
| F.M.K. y D.A. | Federación Madrileña de Karate y Disciplinas Asociadas. |
| SRS | Especificación de Requisitos del Sistema. |
| Aspirante | Persona federada que solicita presentarse a un examen de grado. |
| Tribunal | Órgano encargado de valorar y calificar el examen. |
| Juez | Miembro habilitado para formar parte del tribunal de grados. |
| Árbitro | Auxiliar del Departamento de Grados para exámenes, especialmente en Shiai Kumite. |
| Bloque común | Parte del examen que incluye contenidos técnicos y teóricos comunes. |
| Bloque específico | Parte del examen elegida por el aspirante entre las vías disponibles. |
| Dan | Nivel de grado dentro del sistema de cinturón negro. |
| Apto | Calificación favorable emitida por el tribunal. |
| No Apto | Calificación desfavorable emitida por el tribunal. |

### 1.4 Referencias

- Normativa de Grados de la Federación Madrileña de Karate y D.A., aprobada en Comisión Delegada el 4 de julio de 2017.
- Reglamento de arbitraje W.K.F. para condiciones aplicables a Shiai Kumite, cuando corresponda.

---

## 2. Descripción general

### 2.1 Perspectiva del producto

El sistema será una aplicación web que reemplazará o complementará procesos manuales de inscripción, revisión documental, validación normativa y publicación de resultados. La aplicación servirá como portal único para aspirantes, clubes, técnicos, personal federativo, Departamento de Grados, jueces y administradores.

### 2.2 Funciones principales

El sistema deberá permitir:

1. Crear y publicar convocatorias de examen.
2. Registrar solicitudes oficiales de examen.
3. Validar requisitos administrativos y deportivos.
4. Gestionar documentos y subsanaciones.
5. Calcular requisitos por grado.
6. Gestionar cuotas, reducciones y exenciones.
7. Configurar tribunales y asignar jueces.
8. Registrar calificaciones por bloque y vía.
9. Generar actas oficiales.
10. Comunicar resultados a los aspirantes.
11. Gestionar informes de No Apto.
12. Tramitar situaciones especiales y reconocimiento de méritos.

### 2.3 Clases de usuarios

| Usuario | Descripción |
|---|---|
| Aspirante | Solicita examen, carga documentación y consulta su estado. |
| Técnico avalista | Avala solicitudes hasta 3.er Dan incluido, cuando proceda. |
| Club | Consulta o pregestiona aspirantes vinculados a su entidad. |
| Administrativo federativo | Revisa documentación, pagos, licencias y expedientes. |
| Departamento de Grados | Valida criterios técnicos, tribunales y situaciones especiales. |
| Juez de tribunal | Consulta aspirantes asignados y registra evaluación. |
| Director del Departamento de Grados | Autoriza excepciones, tribunales e informes. |
| Administrador del sistema | Gestiona roles, permisos, catálogos y auditoría. |

### 2.4 Restricciones generales

- El sistema debe ajustarse a la normativa de grados de la F.M.K. y D.A.
- Ningún aspirante podrá ser admitido si falta un requisito obligatorio.
- Los resultados solo serán definitivos tras la generación del acta oficial.
- Todas las validaciones y decisiones deberán ser trazables.
- El sistema deberá cumplir la normativa aplicable de protección de datos.

---

## 3. Requisitos funcionales

### 3.1 Gestión de usuarios

**RF-01. Registro de usuarios**  
El sistema deberá permitir registrar usuarios con roles diferenciados: aspirante, técnico, club, administrativo, juez, director del Departamento de Grados y administrador.

**RF-02. Autenticación segura**  
El sistema deberá permitir inicio de sesión mediante credenciales seguras. Para roles administrativos o de decisión se recomienda autenticación multifactor.

**RF-03. Gestión de permisos**  
El sistema deberá restringir funciones y datos según el rol del usuario.

**RF-04. Auditoría de acciones**  
El sistema deberá registrar creación, modificación, validación, rechazo, carga documental, calificación y emisión de actas.

### 3.2 Gestión de aspirantes

**RF-05. Alta de aspirante**  
El sistema deberá registrar datos personales, federativos, club, grado actual y datos de contacto del aspirante.

**RF-06. Expediente federativo**  
El sistema deberá mantener un expediente digital con grados obtenidos, licencias, convocatorias, resultados, documentos y observaciones.

**RF-07. Asociación con club y técnico**  
El sistema deberá permitir asociar el aspirante a un club y a un técnico avalista cuando corresponda.

**RF-08. Consulta de estado**  
El aspirante deberá poder consultar el estado de su solicitud: borrador, enviada, pendiente de revisión, pendiente de subsanación, validada, rechazada, admitida, evaluada o cerrada.

### 3.3 Convocatorias de examen

**RF-09. Creación de convocatoria**  
El personal autorizado deberá crear convocatorias indicando fecha, sede, grados admitidos, cupos, plazos y observaciones.

**RF-10. Control de plazo ordinario**  
El sistema deberá controlar que la documentación ordinaria se presente con al menos 35 días de antelación al examen.

**RF-11. Publicación de convocatoria**  
El sistema deberá publicar convocatorias disponibles para inscripción.

**RF-12. Cierre de inscripción**  
El sistema deberá impedir nuevas solicitudes fuera del plazo, salvo autorización expresa.

### 3.4 Solicitud oficial de examen

**RF-13. Formulario de solicitud**  
El sistema deberá proporcionar un formulario digital equivalente a la solicitud oficial de examen.

**RF-14. Selección de grado**  
El aspirante deberá seleccionar el grado solicitado: Cinturón Negro, 1.er Dan, 2.º Dan, 3.er Dan, 4.º Dan, 5.º Dan, 6.º Dan o sucesivos.

**RF-15. Selección de vía**  
Cuando proceda, el aspirante deberá elegir vía Kumite, vía Campeonatos o vía Técnica.

**RF-16. Aval obligatorio hasta 3.er Dan**  
El sistema deberá exigir aval de Entrenador Nacional, Técnico Deportivo Superior del mismo club o Director del Departamento de Grados para aspirantes hasta 3.er Dan incluido.

**RF-17. Currículum deportivo desde 4.º Dan**  
El sistema deberá exigir currículum deportivo a aspirantes de 4.º Dan y grados superiores.

### 3.5 Validación administrativa

**RF-18. Validación de edad mínima**  
El sistema deberá calcular la edad del aspirante en la fecha del examen y compararla con la edad mínima requerida.

**RF-19. Validación de permanencia**  
El sistema deberá validar el tiempo mínimo desde el grado anterior.

**RF-20. Validación de licencias**  
El sistema deberá comprobar licencias consecutivas o alternas requeridas por grado.

**RF-21. Licencia vigente**  
El sistema deberá exigir licencia federativa del año en curso.

**RF-22. Carnet de grados**  
El sistema deberá requerir copia del carnet de grados con firmas válidas.

**RF-23. Documentación personal**  
El sistema deberá exigir DNI y fotografías tamaño carnet según el tipo de solicitud.

**RF-24. Exclusión por falta de requisitos**  
El sistema deberá marcar como no admitida una solicitud con requisitos obligatorios ausentes o no subsanados.

### 3.6 Gestión documental

**RF-25. Carga de documentos**  
El sistema deberá permitir cargar documentos PDF, JPG o PNG.

**RF-26. Clasificación documental**  
El sistema deberá clasificar documentos por tipo: DNI, licencia, carnet de grados, solicitud, fotografías, currículum, trabajo escrito, certificado médico, autorización, justificante, acta deportiva y títulos.

**RF-27. Validación documental**  
El personal federativo deberá aprobar, rechazar o solicitar subsanación de cada documento.

**RF-28. Control de versiones**  
El sistema deberá conservar versiones de documentos sustituidos con fecha, usuario y motivo.

### 3.7 Pagos, cuotas y exenciones

**RF-29. Registro de cuota**  
El sistema deberá registrar el pago o estado de pago de la cuota de examen.

**RF-30. Exención por repetición de bloque específico**  
El sistema deberá aplicar exención a repetidores del bloque específico de Cinturón Negro cuando corresponda.

**RF-31. Reducción del 50 % por repetición**  
El sistema deberá aplicar reducción del 50 % durante un año a repetidores de fases a partir de 1.er Dan y repetidores del bloque común de Cinturón Negro.

**RF-32. Reducción por campeonatos nacionales o autonómicos**  
El sistema deberá aplicar reducción del 50 % durante un año a campeones de España y Madrid en categoría individual.

**RF-33. Exención total por campeonatos internacionales**  
El sistema deberá aplicar exención total a campeones del Mundo y Europa en categoría individual.

**RF-34. Aplazamiento justificado**  
El sistema deberá permitir solicitar exención de pago por imposibilidad justificada de asistir, siempre que el justificante se presente en 15 días naturales desde el examen y la nueva presentación se realice en un plazo máximo de un año.

### 3.8 Gestión de exámenes

**RF-35. Registro de bloque común**  
El sistema deberá registrar las partes del bloque común: Kihon Waza, Kata, Kihon Kumite, Bunkai Kumite, Oyo Waza, temario específico, coloquio o trabajo práctico según grado.

**RF-36. Aprobación previa del bloque común**  
El sistema deberá impedir el acceso al bloque específico si el bloque común no está aprobado, salvo exención normativa.

**RF-37. Registro de bloque específico**  
El sistema deberá registrar la vía elegida por el aspirante: Kumite, Campeonatos o Técnica.

**RF-38. Vía Kumite**  
El sistema deberá registrar modalidad, encuentros, categoría, protecciones homologadas y resultado.

**RF-39. Vía Campeonatos**  
El sistema deberá registrar participación oficial, acta deportiva autenticada, combates ganados, puntos acumulados y cumplimiento del mínimo de diez puntos.

**RF-40. Vía Técnica**  
El sistema deberá registrar trabajos de Bunkai, Oyo Waza o Jyu Embu y el combate de Jyu Kumite cuando aplique.

**RF-41. Exención por edad**  
El sistema deberá marcar como exentos de la vía del bloque específico a aspirantes con 41 años cumplidos el día del examen, registrando el trabajo de Jyu Kumite dentro del bloque común.

### 3.9 Tribunal y jueces

**RF-42. Registro de jueces habilitados**  
El sistema deberá almacenar jueces con diploma obtenido mediante cursos convocados por el Departamento de Grados.

**RF-43. Composición del tribunal**  
El Director del Departamento de Grados deberá configurar tribunales, preferiblemente con número impar de jueces.

**RF-44. Asignación de aspirantes**  
El sistema deberá asignar aspirantes a tribunales concretos.

**RF-45. Árbitros auxiliares**  
El sistema deberá permitir asignar árbitros de Shiai Kumite como apoyo en exámenes de cinturón negro.

**RF-46. Registro de votos**  
El sistema deberá permitir registrar votos o decisiones de los jueces.

**RF-47. Mayoría simple**  
El sistema deberá calcular Apto por mayoría simple, salvo reglas especiales.

**RF-48. Mayoría cualificada para 5.º Dan y superiores**  
El sistema deberá exigir al menos el 80 % de jueces a favor para calificar como Apto en exámenes de 5.º Dan en adelante.

### 3.10 Resultados, actas e informes

**RF-49. Resultado provisional**  
El sistema deberá permitir comunicar resultados al finalizar el examen o por escrito a través de la Federación.

**RF-50. Acta oficial**  
El sistema deberá generar el acta oficial de examen. El resultado no será definitivo hasta su emisión.

**RF-51. Suspenso parcial**  
El sistema deberá registrar si el aspirante suspende total o parcialmente.

**RF-52. Validez de primera fase aprobada**  
Si el aspirante solo suspende la segunda fase, el sistema deberá conservar la primera fase aprobada durante un año.

**RF-53. Plazo de repetición**  
El sistema deberá impedir nueva inscripción por suspenso total o parcial hasta transcurridos tres meses.

**RF-54. Informe de No Apto**  
El sistema deberá permitir al aspirante solicitar informe explicativo de las causas del suspenso.

### 3.11 Situaciones especiales

**RF-55. Dispensa médica**  
El sistema deberá permitir solicitudes de dispensa médica con certificado e informe, presentadas con 60 días de antelación.

**RF-56. Autorización de dispensa**  
El sistema deberá impedir considerar admitida una dispensa hasta que la Federación emita respuesta formal.

**RF-57. Convalidación de grados**  
El sistema deberá gestionar convalidaciones de grados obtenidos en otro país, incluyendo currículum visado, licencias, títulos compulsados, planes de estudio, funciones ejercidas y palmarés.

**RF-58. Resolución de convalidación**  
El sistema deberá permitir convalidación total, convalidación de grado inferior o exigencia de examen total o parcial.

**RF-59. Méritos deportivos**  
El sistema deberá registrar campeonatos de Madrid, España, Europa, Mundo y selección nacional absoluta, aplicando exenciones cuando correspondan.

**RF-60. Reducción de tiempo**  
El sistema deberá permitir solicitudes de reducción de tiempo por circunstancias especiales con tres meses de antelación.

**RF-61. Reconocimiento de méritos**  
El sistema deberá gestionar la vía de reconocimiento de méritos para altos grados, incluyendo solicitud, trabajo escrito, licencia, requisitos de edad y tiempo, informe del Departamento de Grados, Junta Directiva y Asamblea.

**RF-62. Incompatibilidad por denegación**  
El sistema deberá impedir que un aspirante se presente a examen en el mismo año si se deniega una petición por vía de reconocimiento de méritos.

### 3.12 Catálogos

**RF-63. Catálogo de grados**  
El sistema deberá mantener un catálogo configurable de grados y requisitos.

**RF-64. Catálogo de estilos reconocidos**  
El sistema deberá registrar estilos reconocidos: Gensei Ryu, Goju Ryu, Kyokushin Kai, Renbu Kai, Shito Ryu, Shoto Kai, Shotokan, Uechi Ryu y Wado Ryu.

**RF-65. Catálogo de katas**  
El sistema deberá asociar katas representativos o recomendados a cada estilo.

**RF-66. Catálogo técnico**  
El sistema deberá registrar técnicas, bloques, modalidades de kumite y contenidos por grado.

---

## 4. Reglas de negocio

### 4.1 Requisitos mínimos por grado

| Grado solicitado | Edad mínima | Permanencia mínima | Licencias necesarias |
|---|---:|---|---|
| Cinturón Negro | 12 años | 1 año de cinturón marrón | 4 consecutivas o 5 alternas |
| 1.er Dan | 16 años | 1 año de cinturón marrón | 3 consecutivas o 4 alternas |
| 2.º Dan | 18 años | 2 años de 1.er Dan | 2 consecutivas o 3 alternas desde 1.er Dan |
| 3.er Dan | 21 años | 3 años de 2.º Dan | 3 consecutivas o 4 alternas desde 2.º Dan |
| 4.º Dan | 25 años | 4 años de 3.er Dan | 4 consecutivas o 5 alternas desde 3.er Dan |
| 5.º Dan | 30 años | 5 años de 4.º Dan | 5 consecutivas o 6 alternas desde 4.º Dan; 14 años desde 1.er Dan |
| 6.º Dan | 36 años | 6 años de 5.º Dan | 6 consecutivas o 7 alternas desde 5.º Dan; 20 años desde 1.er Dan |
| 7.º Dan | 43 años | 7 años de 6.º Dan | 7 consecutivas o 8 alternas desde 6.º Dan; 27 años desde 1.er Dan |
| 8.º Dan | 51 años | 8 años de 7.º Dan | 8 consecutivas o 9 alternas; 35 años desde 1.er Dan |
| 9.º Dan | 60 años | 9 años de 8.º Dan | 9 consecutivas o 10 alternas desde 8.º Dan; 44 años desde 1.er Dan |
| 10.º Dan | 70 años | 10 años de 9.º Dan | 10 consecutivas o 11 alternas desde 9.º Dan; 54 años desde 1.er Dan |

### 4.2 Documentación obligatoria general

El sistema deberá exigir, según corresponda:

- Solicitud oficial de examen cumplimentada.
- Licencia del año en curso.
- Fotocopia del DNI.
- Fotografías tamaño carnet.
- Carnet de grados expedido por la Federación.
- Licencias que acrediten el tiempo de práctica federada.
- Aval técnico hasta 3.er Dan incluido.
- Currículum deportivo desde 4.º Dan.
- Trabajo escrito desde 5.º Dan.
- Justificante de pago o exención de cuota.

### 4.3 Plazos normativos

| Caso | Plazo |
|---|---:|
| Presentación ordinaria de documentación | 35 días antes del examen |
| Solicitud de dispensa médica | 60 días antes del examen |
| Trabajo escrito de 5.º Dan en adelante | 2 meses antes del examen |
| Solicitud de reducción de tiempo | 3 meses antes del examen |
| Justificante por inasistencia justificada | 15 días naturales desde el examen |
| Repetición tras suspenso | Mínimo 3 meses |
| Validez de primera fase aprobada | 1 año |
| Uso de exención por aplazamiento justificado | Máximo 1 año |

### 4.4 Reglas de calificación

- La calificación será Apto o No Apto.
- El bloque común se aprobará por mayoría simple.
- Para 5.º Dan en adelante se necesitará al menos el 80 % de jueces a favor.
- El resultado no será definitivo hasta la emisión del acta oficial.
- El tribunal podrá solicitar explicaciones, interrumpir fases o dar por concluido el examen cuando tenga elementos suficientes de juicio.

### 4.5 Reglas de exclusión

El sistema deberá impedir la admisión cuando:

- No se cumpla la edad mínima.
- No se cumpla la permanencia mínima.
- No se acrediten las licencias necesarias.
- Falte documentación obligatoria.
- No exista licencia vigente.
- No se haya abonado la cuota o validado la exención.
- La solicitud esté fuera de plazo sin autorización.
- El aspirante esté dentro del período mínimo de tres meses tras suspenso.

---

## 5. Requisitos no funcionales

**RNF-01. Protección de datos**  
El sistema deberá proteger datos personales, federativos, médicos y deportivos mediante cifrado, control de acceso y políticas de privacidad.

**RNF-02. Control de acceso por roles**  
Cada usuario solo podrá acceder a las funciones y expedientes permitidos por su rol.

**RNF-03. Auditoría**  
Toda acción relevante deberá quedar registrada con usuario, fecha, hora y descripción.

**RNF-04. Integridad documental**  
Los documentos cargados deberán conservarse sin alteraciones no autorizadas.

**RNF-05. Usabilidad**  
La página web deberá ofrecer formularios guiados, mensajes de validación y estados comprensibles.

**RNF-06. Diseño responsive**  
La aplicación deberá funcionar correctamente en ordenadores, tablets y móviles.

**RNF-07. Accesibilidad**  
La interfaz deberá seguir criterios WCAG 2.1 nivel AA siempre que sea posible.

**RNF-08. Rendimiento**  
El sistema deberá responder en menos de 3 segundos para operaciones comunes bajo carga normal.

**RNF-09. Disponibilidad**  
El sistema deberá estar disponible al menos el 99 % del tiempo durante períodos de inscripción y examen.

**RNF-10. Copias de seguridad**  
Se deberán realizar copias de seguridad periódicas de base de datos y documentos.

**RNF-11. Reglas configurables**  
Edades, plazos, licencias, cuotas, exenciones y requisitos por grado deberán ser configurables por personal autorizado.

**RNF-12. Exportación**  
El sistema deberá exportar informes y actas en PDF, XLSX o CSV cuando proceda.

---

## 6. Modelo de datos propuesto

| Entidad | Descripción |
|---|---|
| Usuario | Credenciales, rol y permisos. |
| Aspirante | Datos personales, federativos, club y expediente. |
| Club | Entidad deportiva asociada a aspirantes y técnicos. |
| Técnico | Persona habilitada para avalar solicitudes. |
| Convocatoria | Fecha, sede, grados, plazos y estado. |
| SolicitudExamen | Inscripción del aspirante a convocatoria y grado. |
| Documento | Archivo cargado, tipo, estado, versión y validación. |
| Licencia | Registro anual de licencia federativa. |
| Grado | Catálogo de grados y requisitos. |
| Tribunal | Grupo de jueces asignado a convocatoria. |
| Juez | Persona habilitada para valorar exámenes. |
| Evaluación | Registro de bloques, vías, votos y resultado. |
| Acta | Documento oficial de resultados definitivos. |
| Pago | Cuota, reducción, exención, justificante y estado. |
| SituaciónEspecial | Dispensa médica, convalidación, méritos o reconocimiento. |
| MéritoDeportivo | Campeonatos, selección, puntos y evidencias. |
| Estilo | Estilo reconocido por la Federación. |
| Kata | Kata asociado a estilo o grado. |

### 6.1 Estados de solicitud

- Borrador.
- Enviada.
- Pendiente de revisión.
- Pendiente de subsanación.
- Validada administrativamente.
- Rechazada.
- Admitida a examen.
- En evaluación.
- Apta provisional.
- No apta provisional.
- Acta emitida.
- Cerrada.

### 6.2 Estados documentales

- No cargado.
- Cargado.
- En revisión.
- Aprobado.
- Rechazado.
- Requiere subsanación.
- Sustituido.

---

## 7. Flujos principales

### 7.1 Inscripción ordinaria

1. El aspirante inicia sesión.
2. Selecciona convocatoria y grado.
3. Completa la solicitud oficial.
4. Selecciona vía de examen cuando corresponda.
5. Carga documentación obligatoria.
6. Solicita aval técnico si aplica.
7. El sistema valida edad, permanencia, licencias y plazos.
8. El aspirante registra pago o solicita exención.
9. Administración revisa documentación.
10. La solicitud queda admitida o pendiente de subsanación.

### 7.2 Evaluación y acta

1. El Departamento de Grados configura tribunal.
2. Se asignan aspirantes al tribunal.
3. Los jueces registran evaluación del bloque común.
4. Si el bloque común es Apto, se habilita el bloque específico cuando aplique.
5. Se registra el resultado de la vía específica.
6. El sistema calcula la calificación según mayoría aplicable.
7. Se genera resultado provisional.
8. La Federación emite el acta oficial.
9. El resultado pasa a definitivo.

### 7.3 Suspenso parcial

1. El tribunal registra No Apto total o parcial.
2. El sistema identifica si existe una fase aprobada conservable.
3. Si solo se suspende la segunda fase, la primera fase queda válida durante un año.
4. El sistema bloquea nueva inscripción durante tres meses.
5. El aspirante puede solicitar informe explicativo.

### 7.4 Dispensa médica

1. El aspirante presenta solicitud con certificado e informe médico.
2. El sistema valida los 60 días de antelación.
3. La Federación revisa la solicitud.
4. Si se autoriza, se adjunta autorización a la inscripción.
5. El Departamento de Grados define la parte del examen a realizar.

### 7.5 Reconocimiento de méritos

1. El aspirante presenta solicitud oficial.
2. Carga trabajo escrito y documentación justificativa.
3. El sistema valida edad, licencia y tiempo requerido.
4. El Departamento de Grados emite informe.
5. La propuesta se remite a Junta Directiva y Asamblea.
6. Se registra y notifica la decisión oficial.

---

## 8. Requisitos de interfaz

### 8.1 Interfaz del aspirante

- Panel de convocatorias disponibles.
- Formulario de solicitud.
- Indicador de progreso documental.
- Validación automática de requisitos.
- Estado de pago o exención.
- Resultado provisional y definitivo.
- Solicitud de informe de No Apto.
- Historial de grados y exámenes.

### 8.2 Interfaz administrativa

- Bandeja de solicitudes.
- Filtros por convocatoria, grado, club, estado y documentación.
- Validación de documentos.
- Gestión de pagos y exenciones.
- Control de plazos.
- Generación de listados y actas.

### 8.3 Interfaz del Departamento de Grados

- Gestión de tribunales.
- Gestión de jueces y árbitros.
- Evaluación de situaciones especiales.
- Revisión de méritos.
- Configuración de reglas por grado.
- Consulta de estadísticas.

### 8.4 Interfaz del tribunal

- Listado de aspirantes asignados.
- Detalle de expediente y requisitos validados.
- Registro de votos y observaciones.
- Calificación por bloque y vía.
- Confirmación de resultado.

---

## 9. Reportes y documentos

**RPT-01. Listado de aspirantes admitidos**  
El sistema deberá generar listados por convocatoria, grado, club y tribunal.

**RPT-02. Listado de solicitudes incompletas**  
El sistema deberá generar reportes de expedientes pendientes de subsanación.

**RPT-03. Acta oficial de examen**  
El sistema deberá generar un acta oficial con convocatoria, tribunal, aspirantes, grados, resultados y validaciones.

**RPT-04. Informe de No Apto**  
El sistema deberá generar informe explicativo cuando el aspirante lo solicite.

**RPT-05. Reporte de méritos y exenciones**  
El sistema deberá listar aspirantes beneficiados por reducciones, exenciones o reconocimientos.

**RPT-06. Estadísticas**  
El sistema deberá generar estadísticas de aptos, no aptos, repetidores, grados solicitados y participación por club.

---

## 10. Criterios de aceptación

| Código | Criterio |
|---|---|
| CA-01 | Un aspirante no puede enviar solicitud sin convocatoria y grado. |
| CA-02 | El sistema rechaza la solicitud si no cumple edad mínima. |
| CA-03 | El sistema detecta incumplimiento de permanencia o licencias. |
| CA-04 | La solicitud no pasa a admitida si falta documentación obligatoria. |
| CA-05 | Los aspirantes hasta 3.er Dan incluido requieren aval válido. |
| CA-06 | Los aspirantes desde 4.º Dan deben adjuntar currículum deportivo. |
| CA-07 | Los aspirantes desde 5.º Dan deben adjuntar trabajo escrito en plazo. |
| CA-08 | El sistema impide evaluar bloque específico si el bloque común no está aprobado. |
| CA-09 | Para 5.º Dan y superiores, el sistema exige 80 % de votos favorables. |
| CA-10 | El resultado no queda definitivo hasta emitir acta oficial. |
| CA-11 | Tras suspenso, el sistema bloquea nueva inscripción durante tres meses. |
| CA-12 | Si solo se suspende segunda fase, conserva la primera durante un año. |
| CA-13 | Una dispensa médica fuera de plazo se marca como no válida salvo autorización. |
| CA-14 | El sistema conserva historial de cambios y documentos sustituidos. |
| CA-15 | Las reglas por grado pueden modificarse sin alterar expedientes cerrados. |

---

## 11. Matriz de trazabilidad normativa

| Área normativa | Requisitos relacionados |
|---|---|
| Requisitos administrativos | RF-18 a RF-28, CA-02 a CA-07 |
| Edad, permanencia y licencias | RF-18, RF-19, RF-20, sección 4.1 |
| Solicitud oficial y aval | RF-13, RF-16, RF-17 |
| Cuotas, reducciones y exenciones | RF-29 a RF-34 |
| Celebración y resultados | RF-49 a RF-54 |
| Tribunal y jueces | RF-42 a RF-48 |
| Bloque común | RF-35, RF-36 |
| Bloque específico | RF-37 a RF-41 |
| Situaciones especiales | RF-55 a RF-62 |
| Vía Campeonatos | RF-39, RF-59 |
| Reconocimiento de méritos | RF-61, RF-62 |
| Estilos reconocidos | RF-64, RF-65 |
| Acta oficial | RF-50, RPT-03 |

---

## 12. Supuestos y dependencias

- La Federación dispone de datos históricos fiables de licencias, grados y resultados.
- Los clubes y técnicos avalistas estarán registrados en el sistema.
- La Federación definirá el formato oficial final de actas, informes y solicitudes.
- Las reglas normativas podrán cambiar, por lo que el sistema debe permitir configuración administrativa.
- Una pasarela de pago, si se integra, dependerá de un proveedor externo.
- La validez jurídica de firmas digitales dependerá de la política interna de la Federación.

---

## 13. Riesgos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Datos históricos incompletos | Validaciones incorrectas | Fase inicial de depuración y carga manual supervisada. |
| Cambios normativos frecuentes | Reprogramación constante | Motor de reglas configurable. |
| Documentos ilegibles | Retrasos administrativos | Validación documental con subsanación. |
| Acceso no autorizado a datos personales | Riesgo legal | Roles, cifrado, auditoría y políticas de seguridad. |
| Baja adopción | Uso parcial del sistema | Formación, interfaz simple y migración gradual. |

---

## 14. Conclusión

El sistema propuesto permitirá digitalizar y automatizar la gestión de grados de la Federación Madrileña de Karate y D.A., reduciendo errores administrativos, asegurando cumplimiento normativo y mejorando la trazabilidad entre aspirantes, clubes, tribunales y Federación.

La aplicación deberá priorizar reglas configurables, seguridad de la información, trazabilidad documental y fidelidad al proceso federativo oficial.
