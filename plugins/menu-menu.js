// C O D I G O   C R E A D O   P O R   P A O L O   X
import { promises as fileSystem } from 'fs';
import { join as joinPath } from 'path';
import fetch from 'node-fetch';
import { xpRange as calculateXpRange } from '../lib/levelling.js';

// Mapeo de categorías
const categoryLabels = {
  'main': 'INFO',
  'game': 'JUEGOS',
  'serbot': 'SUB BOTS',
  'rpg': 'ECONOMÍA',
  'rg': 'REGISTRO',
  'downloader': 'DESCARGAS',
  'marker': 'LOGO - MAKER',
  'nable': 'ACTIVADORES',
  'group': 'GRUPOS',
  'search': 'BUSCADOR',
  'img': 'IMÁGENES',
  'tools': 'HERRAMIENTAS',
  'fun': 'DIVERCIÓN',
  'audio': 'EFECTO DE AUDIOS',
  'sticker': 'STICKERS',
  'nsfw': 'NSFW',
  'owner': 'CREADOR',
  'advanced': 'AVANZADO'
};

// Configuración predeterminada del menú
const defaultMenuConfig = {
  before: ``.trimStart(),
  header: '',
  body: '',
  footer: '',
  after: ''
};

// Función para formatear tiempos
const formatDuration = (milliseconds) => {
  if (isNaN(milliseconds)) return '--:--:--';
  const hours = Math.floor(milliseconds / 3600000);
  const minutes = Math.floor(milliseconds / 60000) % 60;
  const seconds = Math.floor(milliseconds / 1000) % 60;
  return [hours, minutes, seconds].map(unit => unit.toString().padStart(2, '0')).join(':');
};

// Función para generar y enviar el menú
const createAndSendMenu = async (message, { conn, usedPrefix, __dirname }) => {
  try {
    // Leer archivo package.json de forma segura
    const packageInfo = JSON.parse(await fileSystem.readFile(joinPath(__dirname, '../package.json')).catch(() => ({}))) || {};
    
    // Obtener datos del usuario
    const userStats = global.db.data.users[message.sender];
    if (!userStats) throw new Error('Datos del usuario no encontrados');
    const { exp, star, level } = userStats;
    const { min, xp, max } = calculateXpRange(level, global.multiplier);
    
    // Obtener nombre del usuario
    const userName = await conn.getName(message.sender);

    // Obtener fecha y hora actuales
    const currentTime = new Date(Date.now() + 3600000);
    const locale = 'es';
    const weekDays = ['Pahing', 'Pon', 'Wage', 'Kliwon', 'Legi'];
    const dayName = weekDays[Math.floor(currentTime / 84600000) % 5];
    const weekDay = currentTime.toLocaleDateString(locale, { weekday: 'long' });
    const fullDate = currentTime.toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' });
    const islamicDate = Intl.DateTimeFormat(`${locale}-TN-u-ca-islamic`, { day: 'numeric', month: 'long', year: 'numeric' }).format(currentTime);
    const time = currentTime.toLocaleTimeString(locale, { hour: 'numeric', minute: 'numeric', second: 'numeric' });

    // Obtener tiempos de actividad
    const systemUptime = process.uptime() * 1000;
    let runtimeUptime;
    if (process.send) {
      process.send('uptime');
      runtimeUptime = await new Promise((resolve) => {
        process.once('message', resolve);
        setTimeout(resolve, 1000);
      }) * 1000;
    } else {
      runtimeUptime = systemUptime;
    }

    // Formatear tiempos
    const formattedRuntimeUptime = formatDuration(runtimeUptime);
    const formattedSystemUptime = formatDuration(systemUptime);

    // Información del sistema
    const totalUsersCount = Object.keys(global.db.data.users).length;
    const registeredUsersCount = Object.values(global.db.data.users).filter(user => user.registered).length;
    const activePlugins = Object.values(global.plugins).filter(plugin => !plugin.disabled).map(plugin => ({
      help: Array.isArray(plugin.tags) ? plugin.help : [plugin.help],
      tags: Array.isArray(plugin.tags) ? plugin.tags : [plugin.tags],
      prefix: 'customPrefix' in plugin,
      star: plugin.star,
      premium: plugin.premium,
      enabled: !plugin.disabled
    }));

    // Actualizar categorías
    for (const plugin of activePlugins) {
      if (plugin && 'tags' in plugin) {
        for (const tag of plugin.tags) {
          if (!(tag in categoryLabels) && tag) categoryLabels[tag] = tag;
        }
      }
    }

    // Crear menú
    conn.menu = conn.menu || {};
    const menuBefore = conn.menu.before || defaultMenuConfig.before;
    const menuHeader = conn.menu.header || defaultMenuConfig.header;
    const menuBody = conn.menu.body || defaultMenuConfig.body;
    const menuFooter = conn.menu.footer || defaultMenuConfig.footer;
    const menuAfter = conn.menu.after || (conn.user.jid === global.conn.user.jid ? '' : ``) + defaultMenuConfig.after;
    
    const menuText = [
      menuBefore,
      ...Object.keys(categoryLabels).map(categoryKey => {
        return menuHeader.replace(/%category/g, categoryLabels[categoryKey]) + '\n' + 
        [
          ...activePlugins.filter(plugin => plugin.tags && plugin.tags.includes(categoryKey) && plugin.help).map(plugin => {
            return plugin.help.map(command => {
              return menuBody.replace(/%cmd/g, plugin.prefix ? command : '%p' + command)
                .replace(/%isstar/g, plugin.star ? '˄' : '')
                .replace(/%isPremium/g, plugin.premium ? '˄' : '')
                .trim();
            }).join('\n');
          }),
          menuFooter
        ].join('\n');
      }),
      menuAfter
    ].join('\n');

    let formattedMenuText = typeof conn.menu === 'string' ? conn.menu : typeof conn.menu === 'object' ? menuText : '';
    const replacements = {
      '%': '%',
      p: usedPrefix,
      uptime: formattedSystemUptime,
      muptime: formattedRuntimeUptime,
      taguser: '@' + message.sender.split("@s.whatsapp.net")[0],
      wasp: '@0',
      me: await conn.getName(conn.user.jid),
      npmname: packageInfo.name,
      version: packageInfo.version,
      npmdesc: packageInfo.description,
      npmmain: packageInfo.main,
      author: packageInfo.author.name,
      license: packageInfo.license,
      exp: exp - min,
      maxexp: xp,
      totalexp: exp,
      xp4levelup: max - exp,
      github: packageInfo.homepage ? packageInfo.homepage.url || packageInfo.homepage : '[unknown github url]',
      level: level,
      star: star,
      name: userName,
      weton: dayName,
      week: weekDay,
      date: fullDate,
      dateIslamic: islamicDate,
      time: time,
      totalreg: totalUsersCount,
      rtotalreg: registeredUsersCount,
      readmore: readMorePlaceholder
    };

    formattedMenuText = formattedMenuText.replace(new RegExp(`%(${Object.keys(replacements).sort((a, b) => b.length - a.length).join`|`})`, 'g'), (_, key) => '' + replacements[key]);

    // Enviar mensaje de texto primero
    await conn.sendMessage(message.chat, { caption: formattedMenuText.trim(), mentions: [message.sender] });
    
    // Enviar video en paralelo
    const videoUrl = 'https://drive.google.com/uc?export=download&id=1QaxZig8Bk0LrKwU76d66PujcVpIakoai';
    const listMessage = [
      {
        title: '',
        rows: [
          { header: "📚ＭＥＮＵ ＣＯＭＰＬＥＴＯ", title: "", id: `.allmenu`, description: `𝙼𝚞𝚎𝚜𝚝𝚛𝚎𝚖𝚎 𝚝𝚘𝚍𝑜𝚜 𝚕𝚘𝚜 𝚌𝚘𝚖𝚊𝚗𝚍𝚘𝚜 𝚍𝚎 𝙼𝚒𝚣𝚞𝚔𝚒 | 𝙱𝚘𝚝\n` },
          { header: "SudBot", title: "", id: `.serbot --code`, description: `𝚀𝚞𝚒𝚎𝚛𝚘 𝚌𝚘𝚗𝚟𝚎𝚛𝚝𝚒𝚛𝚜𝚎 𝚎𝚗 𝚂𝚞𝚍𝙱𝚘𝚝 𝚍𝚎 𝙼𝚒𝚣𝚞𝚔𝚒 | 𝙱𝚘𝚝\n` },
          { header: "🚀ＶＥＬＯＣＩＤＡＤ", title: "", id: `.ping`, description: `𝚅𝚎𝚕𝚘𝚌𝚒𝚍𝚨𝚍 𝚍𝚎 𝙼𝚒𝚣𝚞𝚔𝚒 | 𝙱𝚘𝚝\n` },
          { header: "⏰ＵＰＴＩＭＥ", title: "", id: `.estado`, description: `𝚃𝚒𝚎𝚖𝚙𝚘 𝚊𝚌𝚝𝚒𝚟𝚘 𝚍𝚎 𝙼𝚒𝚣𝚞𝚔𝚒 | 𝙱𝚘𝚝\n` },
          { header: "🌐ＩＤＩＯＭＡ", title: "", id: `.idioma`, description: `𝙴𝚕𝚎𝚐𝚎𝚗 𝚒𝚍𝚒𝚘𝚖𝚎\n` },
          { header: "✅ＳＴＡＦＦ ＭＩＺＵＫＩ | ＢＯＴ", title: "", id: `.creador`, description: `𝚂𝚝𝚊𝚏𝚏 𝙼𝚒𝚣𝚞𝚔𝚒 | 𝙱𝚘𝚝` }
        ]
      }
    ];

    await conn.sendList(message.chat, '', null, `𝙊𝙋𝘾𝙄𝙊𝙉𝙀𝙎 𝐒𝐘𝐒𝐓𝐄𝐌 𝐗`, listMessage, { mentions: [message.sender] });
    await conn.sendMessage(message.chat, { video: { url: videoUrl }, caption: '', mentions: [message.sender] });

  } catch (error) {
    console.error('Error al generar o enviar el menú:', error);
    conn.reply(message.chat, '❎ Lo sentimos, el menú tiene un error.', message);
  }
};

// Configuración del comando
createAndSendMenu.help = ['menu'];
createAndSendMenu.tags = ['main'];
createAndSendMenu.command = ['menu', 'help', 'menú'];
createAndSendMenu.register = true;

export default createAndSendMenu;

// Placeholder para leer más
const readMorePlaceholder = String.fromCharCode(8206).repeat(4001);
