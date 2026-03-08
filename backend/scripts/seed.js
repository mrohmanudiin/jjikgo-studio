const prisma = require('./src/config/prisma');

async function main() {
    console.log('Seeding database...');

    // 1. Seed Themes
    const themes = [
        { name: 'Basic', price: 50.0, booth_number: '1' },
        { name: 'Vintage', price: 60.0, booth_number: '2' },
        { name: 'Y2K', price: 70.0, booth_number: '3' },
        { name: 'ID Photo', price: 40.0, booth_number: '4' }
    ];

    for (const theme of themes) {
        const createdTheme = await prisma.theme.create({
            data: theme
        });
        console.log(`Created theme: ${createdTheme.name}`);

        // Create a matching booth for each theme
        await prisma.booth.create({
            data: {
                name: `Booth ${theme.booth_number}`,
                theme_id: createdTheme.id,
                status: 'available'
            }
        });
        console.log(`Created booth: Booth ${theme.booth_number}`);
    }

    console.log('Database seeded successfully!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
