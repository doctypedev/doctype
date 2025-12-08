import {intro, outro, select, isCancel, cancel} from '@clack/prompts';
import {initCommand} from './init';
import {checkCommand} from './check';
import {fixCommand} from './fix';
import {generateCommand} from './generate';
import {changesetCommand} from './changeset';
import pc from 'picocolors';

export async function showMainMenu() {
    console.clear();
    intro(pc.bgCyan(pc.black(' Doctype CLI ')));

    const action = await select({
        message: 'What would you like to do?',
        options: [
            {value: 'init', label: 'Initialize Doctype configuration', hint: 'init'},
            {value: 'check', label: 'Check for documentation drift', hint: 'check'},
            {value: 'generate', label: '[AI] Generate documentation', hint: 'generate'},
            {value: 'changeset', label: '[AI] Generate changeset file', hint: 'changeset'},
            {value: 'fix', label: '[AI] Fix documentation', hint: 'fix'},
            {value: 'exit', label: 'Exit', hint: 'exit'},
        ],
    });

    if (isCancel(action) || action === 'exit') {
        cancel('Operation cancelled.');
        process.exit(0);
    }

    try {
        switch (action) {
            case 'init':
                await handleInit();
                break;
            case 'check':
                await handleCheck();
                break;
            case 'fix':
                await handleFix();
                break;
            case 'generate':
                await handleGenerate();
                break;
            case 'changeset':
                await handleChangeset();
                break;
        }
    } catch (error) {
        console.error(pc.red('An error occurred:'), error);
        process.exit(1);
    }

    outro(pc.green('Done!'));
}

async function handleInit() {
    const result = await initCommand({verbose: false});
    if (!result.success) process.exit(1);
}

async function handleCheck() {
    // We can ask for extra options if we want to be fancy,
    // but for the main menu, defaults are usually best.
    // Maybe asking for "verbose" would be nice?
    // For now, let's stick to defaults to keep it simple as requested.
    const result = await checkCommand({
        verbose: true, // Verbose is helpful in interactive mode
        strict: false, // Don't crash on drift, just report it
        map: undefined
    });

    if (result.configError) process.exit(1);
    // We don't exit(1) on drift here because it's interactive,
    // maybe the user wants to fix it next?
    // But usually CLI tools exit. Let's keep it 0 for "command ran successfully" even if drift found.
}

async function handleFix() {
    const result = await fixCommand({
        verbose: true,
        dryRun: false,
        autoCommit: false,
        interactive: true, // Use interactive mode if supported
        noAI: false,
        map: undefined
    });

    if (result.configError || !result.success) process.exit(1);
}

async function handleGenerate() {
    const result = await generateCommand({
        verbose: true,
        dryRun: false,
        autoCommit: false,
        interactive: true,
        noAI: false,
        map: undefined
    });

    if (result.configError || !result.success) process.exit(1);
}

async function handleChangeset() {
    const result = await changesetCommand({
        baseBranch: 'main',
        stagedOnly: false,
        outputDir: '.changeset',
        noAI: false,
        verbose: true,
        interactive: true // Force interactive selection
    });

    if (!result.success) process.exit(1);
}
