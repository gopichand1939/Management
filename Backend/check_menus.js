const pool = require("./Config/Database");
const { getMenusByRole } = require("./Menu/MenuModel");

const checkMenus = async () => {
    const menus = await getMenusByRole("super_admin");
    console.log("SUPER_ADMIN MENUS:");
    menus.forEach(m => {
        console.log(`Menu ID: ${m.menu_id}, Name: ${m.menu_name}, Actions:`, m.actions.map(a => a.action_name));
    });
    pool.end();
};

checkMenus().catch(err => {
    console.error(err);
    pool.end();
});
