// src/components/sections/BenefitsSection.jsx
import React from 'react';
import { useTranslation } from 'react-i18next';

const BenefitsSection = () => {
  const { t } = useTranslation('benefits');

  return (
    <section className="frame3">
      <div className="frame3-container">
        <h2 className="frame3-title">{t('title')}</h2>
        <div className="benefits-container">
          {/* Line 1: 3 cards */}
          <div className="benefits-row row1">
            <div className="benefit-card top-service">
              <h3>{t('cards.topService.title')}</h3>
              <p>{t('cards.topService.description')}</p>
            </div>
            <div className="benefit-card lowest-time">
              <h3>{t('cards.lowestTime.title')}</h3>
              <p>{t('cards.lowestTime.description')}</p>
            </div>
            <div className="benefit-card multichannel">
              <h3>{t('cards.multichannel.title')}</h3>
              <p>{t('cards.multichannel.description')}</p>
            </div>
          </div>

          {/* Line 2: 2 horizontal boxes */}
          <div className="benefits-row row2">
            <div className="benefit-card horizontal reduce-expenses">
              <h3>{t('cards.reduceExpenses.title')}</h3>
              <p>{t('cards.reduceExpenses.description')}</p>
            </div>
            <div className="benefit-card horizontal increase-income">
              <h3>{t('cards.increaseIncome.title')}</h3>
              <p>{t('cards.increaseIncome.description')}</p>
            </div>
          </div>

          {/* Line 3: 3 cards */}
          <div className="benefits-row row3">
            <div className="benefit-card integrations">
              <h3>{t('cards.integrations.title')}</h3>
              <p>{t('cards.integrations.description')}</p>
            </div>
            <div className="benefit-card advanced-ai">
              <h3>{t('cards.advancedAi.title')}</h3>
              <p>{t('cards.advancedAi.description')}</p>
            </div>
            <div className="benefit-card continuous-learning">
              <h3>{t('cards.continuousLearning.title')}</h3>
              <p>{t('cards.continuousLearning.description')}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default BenefitsSection;