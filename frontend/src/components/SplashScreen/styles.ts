import styled, { keyframes } from 'styled-components';

const fadeOut = keyframes`
  from {
    opacity: 1;
  }
  to {
    opacity: 0;
  }
`;

export const Container = styled.div<{ isLoading: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-color: #0a0b0d;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  animation: ${({ isLoading }) => !isLoading && fadeOut} 0.5s ease-out forwards;
`;

export const Logo = styled.img`
  width: 200px;
  height: 200px;
  margin-bottom: 2rem;
`;

export const LoadingText = styled.p`
  color: #00ff9d;
  font-size: 1.2rem;
  margin-top: 1rem;
`; 
