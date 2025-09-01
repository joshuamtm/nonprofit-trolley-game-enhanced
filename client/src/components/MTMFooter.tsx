import React from 'react';

const MTMFooter: React.FC = () => {
  return (
    <footer className="mtm-footer">
      <img 
        src="/assets/MTM-logo-200x200.png" 
        alt="Meet the Moment" 
        style={{ height: '40px' }}
      />
      <p>Prototype by Meet the Moment</p>
    </footer>
  );
};

export default MTMFooter;