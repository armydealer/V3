/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';
import { WorkshopProvider } from './store/WorkshopContext';
import { SimpleLayoutShell, SimpleSectionId } from './components/SimpleLayoutShell';
import { SimpleHomeView } from './simple/SimpleHomeView';
import { SimplePantryView } from './simple/SimplePantryView';
import { SimpleRecipesView } from './simple/SimpleRecipesView';
import { SimpleOverheadView } from './simple/SimpleOverheadView';
import { SimpleBackupInstallView } from './simple/SimpleBackupInstallView';

function ShirinTarazSimpleApp() {
  const [activeSection, setActiveSection] = useState<SimpleSectionId>('home');

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [activeSection]);

  return (
    <SimpleLayoutShell activeSection={activeSection} onSelectSection={setActiveSection}>
      {activeSection === 'home' && <SimpleHomeView onNavigate={setActiveSection} />}
      {activeSection === 'pantry' && <SimplePantryView />}
      {activeSection === 'recipes' && <SimpleRecipesView onNavigate={setActiveSection} />}
      {activeSection === 'overhead' && <SimpleOverheadView />}
      {activeSection === 'backup' && <SimpleBackupInstallView />}
    </SimpleLayoutShell>
  );
}

export default function App() {
  return (
    <WorkshopProvider>
      <ShirinTarazSimpleApp />
    </WorkshopProvider>
  );
}
