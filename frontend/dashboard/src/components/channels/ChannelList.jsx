// frontend/dashboard/src/components/channels/ChannelList.jsx

import React, { useState, Fragment } from 'react';
import { 
  HiOutlineStatusOnline, 
  HiOutlineStatusOffline, 
  HiOutlineDotsVertical, 
  HiOutlineChat, 
  HiOutlineCog, 
  HiOutlineTrash 
} from 'react-icons/hi';
import { Menu, Transition } from '@headlessui/react';
import channelService from '../../services/channelService';

const platformIcons = {
  whatsapp: (
    <div className="rounded-full bg-green-500 p-3">
      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12.001 2C17.524 2 22 6.475 22 11.999C22 17.523 17.524 22 12.001 22C10.051 22 8.235 21.473 6.699 20.546L2 22L3.454 17.301C2.527 15.765 2 13.949 2 11.999C2 6.475 6.477 2 12.001 2ZM8.907 7.698C8.759 7.703 8.615 7.736 8.483 7.794C8.346 7.854 8.195 7.958 8.034 8.105C7.919 8.211 7.752 8.377 7.602 8.581C7.278 9.015 7.105 9.498 7.105 9.982C7.106 10.373 7.207 10.754 7.368 11.115C7.693 11.838 8.289 12.587 9.111 13.307C9.284 13.467 9.457 13.62 9.638 13.763C10.651 14.534 11.832 15.047 13.096 15.256L13.595 15.319C13.737 15.328 13.879 15.319 14.021 15.316C14.292 15.31 14.557 15.263 14.805 15.177C14.937 15.129 15.067 15.075 15.195 15.015C15.195 15.015 15.237 14.99 15.318 14.941C15.437 14.868 15.504 14.821 15.599 14.734C15.671 14.67 15.735 14.597 15.788 14.516C15.866 14.395 15.943 14.173 15.98 13.915C16.008 13.72 16.029 13.611 16.03 13.502C16.031 13.447 16.026 13.392 16.015 13.338C16 13.258 15.935 13.174 15.837 13.085C15.792 13.044 15.742 13.003 15.688 12.964C15.579 12.882 15.461 12.815 15.383 12.769C15.361 12.757 15.3 12.731 15.23 12.703C15.086 12.647 14.939 12.603 14.795 12.559C14.712 12.534 14.633 12.509 14.568 12.484C14.441 12.437 14.373 12.403 14.293 12.389C14.272 12.385 14.251 12.386 14.23 12.39C14.156 12.404 14.068 12.471 14.012 12.551C13.98 12.598 13.929 12.769 13.929 12.769C13.929 12.769 13.808 13.086 13.624 13.225C13.504 13.315 13.357 13.322 13.251 13.297C13.183 13.281 13.115 13.259 13.047 13.233C12.967 13.203 12.887 13.171 12.814 13.141C12.653 13.073 12.503 13.003 12.379 12.935C11.574 12.504 10.89 11.861 10.399 11.05C10.319 10.931 10.253 10.816 10.201 10.704C10.034 10.374 9.965 10.06 9.996 9.781C10.012 9.637 10.083 9.508 10.188 9.401C10.229 9.36 10.272 9.327 10.315 9.295C10.391 9.239 10.451 9.175 10.504 9.105C10.587 8.99 10.611 8.875 10.616 8.797C10.621 8.73 10.613 8.667 10.595 8.608C10.553 8.469 10.35 8.192 10.105 7.937C9.971 7.798 9.84 7.652 9.741 7.552C9.661 7.472 9.59 7.398 9.513 7.334C9.407 7.247 9.298 7.192 9.179 7.167C9.12 7.155 9.061 7.149 9.001 7.149C8.915 7.149 8.827 7.16 8.739 7.181L8.907 7.698Z" />
      </svg>
    </div>
  ),
  facebook: (
    <div className="rounded-full bg-blue-600 p-3">
      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2.04C6.5 2.04 2 6.53 2 12.06C2 17.06 5.66 21.21 10.44 21.96V14.96H7.9V12.06H10.44V9.85C10.44 7.34 11.93 5.96 14.22 5.96C15.31 5.96 16.45 6.15 16.45 6.15V8.62H15.19C13.95 8.62 13.56 9.39 13.56 10.18V12.06H16.34L15.89 14.96H13.56V21.96C15.9164 21.5878 18.0622 20.3855 19.6099 18.57C21.1576 16.7546 22.0054 14.4456 22 12.06C22 6.53 17.5 2.04 12 2.04Z" />
      </svg>
    </div>
  ),
  instagram: (
    <div className="rounded-full bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-500 p-3">
      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12.002 21.041C9.54195 21.041 9.14795 21.028 8.17195 20.986C7.31295 20.951 6.67495 20.8 6.10395 20.577C5.50795 20.343 4.96795 20 4.51295 19.548C4.06195 19.094 3.71795 18.556 3.48095 17.964C3.25595 17.396 3.10495 16.762 3.06795 15.909C3.02495 14.935 3.01295 14.538 3.01295 12.084C3.01295 9.62801 3.02595 9.23901 3.06795 8.26001C3.10395 7.40201 3.25495 6.76401 3.47695 6.19401C3.71095 5.59801 4.05995 5.05801 4.50995 4.60301C4.96495 4.15201 5.49995 3.80801 6.09195 3.57001C6.66295 3.34501 7.29595 3.19401 8.15095 3.15701C9.12495 3.11401 9.52195 3.10201 11.976 3.10201C14.451 3.10201 14.84 3.11501 15.816 3.15701C16.673 3.19301 17.312 3.34401 17.883 3.56601C18.479 3.80001 19.019 4.14901 19.473 4.59901C19.925 5.05401 20.268 5.59001 20.507 6.18201C20.732 6.75301 20.883 7.38601 20.921 8.24101C20.964 9.21601 20.976 9.61301 20.976 12.067C20.976 14.521 20.964 14.919 20.921 15.896C20.884 16.754 20.732 17.392 20.507 17.962C20.268 18.558 19.925 19.098 19.473 19.553C19.019 20.003 18.479 20.347 17.884 20.585C17.313 20.81 16.68 20.961 15.816 20.998C14.842 21.041 14.448 21.053 11.976 21.053C9.50195 21.053 9.10495 21.041 8.12995 20.998C7.29095 20.961 6.65795 20.813 6.09295 20.585C5.0312 20.082 4.18795 19.222 3.70695 18.156C3.48195 17.591 3.33095 16.957 3.29395 16.103C3.25095 15.129 3.23895 14.732 3.23895 12.277C3.23895 9.82201 3.25095 9.42501 3.29395 8.45101C3.33095 7.59301 3.48195 6.95501 3.70695 6.38401C4.18795 5.31901 5.0312 4.45901 6.09295 3.95601C6.65795 3.73101 7.28995 3.58001 8.12995 3.54301C9.10495 3.50001 9.50095 3.48801 11.976 3.48801C14.451 3.48801 14.842 3.50001 15.816 3.54301C16.674 3.58001 17.313 3.73101 17.884 3.95301C18.947 4.45601 19.808 5.31601 20.29 6.38101C20.515 6.94801 20.666 7.58201 20.703 8.43601C20.746 9.41101 20.758 9.80801 20.758 12.263C20.758 14.718 20.746 15.116 20.703 16.09C20.666 16.948 20.515 17.586 20.29 18.154C20.042 18.737 19.699 19.277 19.253 19.722C18.798 20.174 18.26 20.519 17.671 20.76C17.103 20.985 16.471 21.136 15.615 21.173C14.64 21.216 14.244 21.228 11.769 21.228C9.29395 21.228 8.89795 21.216 7.92195 21.173C7.08995 21.139 6.45495 20.991 5.88995 20.767C5.30695 20.519 4.76795 20.171 4.32195 19.722C3.87495 19.274 3.53295 18.736 3.28595 18.152C3.06095 17.586 2.90995 16.953 2.87295 16.097C2.84595 15.339 2.83795 14.919 2.83795 12.263C2.83795 9.60701 2.84595 9.18701 2.87295 8.42901C2.90995 7.57101 3.06095 6.93701 3.28595 6.37201C3.53295 5.78901 3.87495 5.25001 4.32195 4.80401C4.76795 4.35801 5.30695 4.01001 5.88995 3.76801C6.45495 3.54301 7.07695 3.39201 7.92195 3.35501C8.89695 3.32901 9.29295 3.31601 11.769 3.31601C14.244 3.31601 14.64 3.32801 15.615 3.35501C16.471 3.39201 17.103 3.54301 17.671 3.76801C18.258 4.01001 18.798 4.35801 19.253 4.80401C19.699 5.25001 20.042 5.78901 20.29 6.37201C20.515 6.93901 20.666 7.57201 20.703 8.42901C20.73 9.18701 20.746 9.60701 20.746 12.263C20.746 14.919 20.73 15.339 20.703 16.097C20.666 16.953 20.515 17.586 20.29 18.152C20.062 19.212 19.206 20.075 18.146 20.308C17.588 20.534 16.956 20.685 16.109 20.722C15.141 20.758 14.742 20.77 12.296 20.77C9.84995 20.77 9.45495 20.758 8.48095 20.722C7.63495 20.685 7.00195 20.534 6.44395 20.308C5.38495 20.062 4.53095 19.201 4.31095 18.141C4.08595 17.574 3.93495 16.94 3.89795 16.086C3.86395 15.121 3.85195 14.724 3.85195 12.251C3.85195 9.77701 3.86395 9.38001 3.89795 8.41701C3.93195 7.56301 4.08295 6.93001 4.30695 6.36201C4.51295 5.30301 5.37395 4.44501 6.44395 4.21301C7.01095 3.98801 7.64995 3.83701 8.49195 3.80001C9.45895 3.77001 9.85495 3.75801 12.296 3.75801C14.738 3.75801 15.133 3.77001 16.109 3.80001C16.964 3.83701 17.602 3.98801 18.173 4.21301C19.231 4.45101 20.087 5.30901 20.302 6.36201C20.526 6.93101 20.677 7.56301 20.715 8.41701C20.751 9.39101 20.763 9.78801 20.763 12.251C20.763 14.714 20.751 15.111 20.715 16.086C20.677 16.944 20.526 17.578 20.302 18.145C20.074 19.205 19.218 20.068 18.158 20.3C17.591 20.525 16.958 20.676 16.104 20.713C15.137 20.749 14.742 20.761 12.301 20.761C9.85995 20.761 9.45995 20.749 8.48795 20.713C7.64995 20.676 7.01795 20.525 6.45195 20.3C6.16595 20.197 5.90195 20.045 5.67095 19.841C5.43995 19.641 5.24095 19.396 5.09195 19.108C4.86695 18.549 4.71595 17.924 4.67895 17.079C4.63595 16.119 4.62395 15.713 4.62395 13.283C4.62395 10.853 4.63595 10.446 4.67895 9.48701C4.71595 8.64301 4.86695 8.01701 5.09195 7.46001C5.24095 7.17201 5.43995 6.92801 5.68395 6.71801C5.91495 6.51401 6.17895 6.36201 6.46495 6.25901C7.02295 6.03401 7.65495 5.88301 8.49295 5.84601C9.06195 5.82501 9.33895 5.81201 10.389 5.80701L12.002 21.041ZM9.52195 12.084C9.52195 13.489 10.0659 14.836 11.0359 15.815C12.0059 16.795 13.341 17.346 14.731 17.346C16.1211 17.346 17.4561 16.795 18.4262 15.815C19.3962 14.836 19.9402 13.489 19.9402 12.084C19.9402 10.679 19.3962 9.33299 18.4262 8.35399C17.4561 7.37499 16.1211 6.82399 14.731 6.82399C13.341 6.82399 12.0059 7.37499 11.0359 8.35399C10.0659 9.33299 9.52195 10.679 9.52195 12.084ZM11.317 12.084C11.317 11.189 11.6695 10.331 12.2969 9.69899C12.9243 9.06699 13.7748 8.70999 14.6618 8.70999C15.5489 8.70999 16.3993 9.06699 17.0267 9.69899C17.6541 10.331 18.0066 11.189 18.0066 12.084C18.0066 12.979 17.6541 13.837 17.0267 14.469C16.3993 15.101 15.5489 15.458 14.6618 15.458C13.7748 15.458 12.9243 15.101 12.2969 14.469C11.6695 13.837 11.317 12.979 11.317 12.084ZM15.817 7.97501C16.0086 7.97501 16.198 7.92838 16.3693 7.83875C16.5406 7.74912 16.69 7.61905 16.8043 7.45882C16.9187 7.29859 16.995 7.11226 17.0269 6.91385C17.0588 6.71544 17.0453 6.51231 16.9877 6.32108C16.93 6.12986 16.8297 5.95647 16.6949 5.81599C16.5602 5.67552 16.3953 5.57234 16.2126 5.51572C16.0299 5.45911 15.8355 5.45077 15.6481 5.49147C15.4607 5.53216 15.2859 5.62057 15.1376 5.74847C14.9247 5.94825 14.8032 6.22064 14.7991 6.50581C14.795 6.79098 14.9087 7.06687 15.1159 7.27271C15.323 7.47855 15.5992 7.59156 15.8844 7.5967L15.817 7.97501ZM7.33295 21.111C6.52895 21.073 6.03395 20.949 5.69195 20.84C5.24595 20.694 4.92695 20.518 4.59195 20.185C4.25695 19.852 4.07895 19.535 3.93495 19.091C3.82395 18.752 3.70095 18.257 3.66395 17.458C3.62095 16.484 3.60895 16.087 3.60895 12.084C3.60895 8.08101 3.62095 7.68401 3.66395 6.71001C3.70095 5.91101 3.82495 5.41601 3.93495 5.07701C4.07995 4.63301 4.25695 4.31401 4.59095 3.97901C4.92395 3.64401 5.24095 3.46601 5.68595 3.32101C6.02395 3.21001 6.51895 3.08701 7.31795 3.05001C8.29195 3.00701 8.68895 2.99501 12.692 2.99501C16.695 2.99501 17.092 3.00701 18.066 3.05001C18.865 3.08701 19.36 3.21101 19.699 3.32101C20.145 3.46601 20.464 3.64401 20.799 3.97901C21.134 4.31401 21.312 4.63301 21.457 5.07701C21.568 5.41501 21.691 5.91001 21.728 6.71001C21.771 7.68301 21.783 8.08101 21.783 12.084C21.783 16.087 21.771 16.484 21.728 17.458C21.691 18.257 21.567 18.752 21.457 19.091C21.312 19.535 21.134 19.852 20.799 20.185C20.466 20.518 20.145 20.694 19.699 20.84C19.361 20.951 18.866 21.074 18.066 21.111C17.093 21.154 16.695 21.166 12.692 21.166C8.68895 21.166 8.29295 21.154 7.33295 21.111Z" />
      </svg>
    </div>
  ),
  twitter: (
    <div className="rounded-full bg-blue-400 p-3">
      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" viewBox="0 0 24 24" fill="currentColor">
        <path d="M22.162 5.65593C21.3986 5.99362 20.589 6.2154 19.76 6.31393C20.6337 5.79136 21.2877 4.96894 21.6 3.99993C20.78 4.48793 19.881 4.82993 18.944 5.01493C18.3146 4.34151 17.4804 3.89489 16.5709 3.74451C15.6615 3.59413 14.7279 3.74842 13.9153 4.18338C13.1026 4.61834 12.4564 5.30961 12.0771 6.14972C11.6978 6.98983 11.6067 7.93171 11.818 8.82893C10.1551 8.74558 8.52832 8.31345 7.04328 7.56059C5.55823 6.80773 4.24812 5.75098 3.19799 4.45893C2.82628 5.09738 2.63095 5.82315 2.63199 6.56193C2.63199 8.01193 3.36999 9.29293 4.49199 10.0429C3.828 10.022 3.17862 9.84271 2.59799 9.51993V9.57193C2.59819 10.5376 2.93236 11.4735 3.54384 12.221C4.15532 12.9684 5.00647 13.4814 5.95299 13.6729C5.33661 13.84 4.6903 13.8646 4.06299 13.7449C4.32986 14.5762 4.85 15.3031 5.55058 15.824C6.25117 16.345 7.09712 16.6337 7.96999 16.6499C7.10247 17.3313 6.10917 17.8349 5.04687 18.1321C3.98458 18.4293 2.87412 18.5142 1.77899 18.3819C3.69069 19.6114 5.91609 20.2641 8.18899 20.2619C15.882 20.2619 20.089 13.8889 20.089 8.36193C20.089 8.18193 20.084 7.99993 20.076 7.82193C20.8949 7.23009 21.6016 6.49695 22.163 5.65693L22.162 5.65593Z" />
      </svg>
    </div>
  )
};

const ChannelList = ({ channels, onChannelSelect, onConnectClick }) => {
  const [channelBeingDeleted, setChannelBeingDeleted] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  const handleDeleteClick = (channelId) => {
    setChannelBeingDeleted(channelId);
    setShowDeleteConfirm(true);
  };
  
  const handleConfirmDelete = async () => {
    try {
      await channelService.deleteChannel(channelBeingDeleted);
      setShowDeleteConfirm(false);
      // Typically we would refresh the list here
      window.location.reload();
    } catch (err) {
      console.error('Error deleting channel:', err);
    }
  };

  if (channels.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-lg shadow">
        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-indigo-100">
          <HiOutlineChat className="h-6 w-6 text-indigo-600" />
        </div>
        <h3 className="mt-2 text-lg font-medium text-gray-900">No channels connected</h3>
        <p className="mt-1 text-sm text-gray-500">
          Get started by connecting your first messaging platform.
        </p>
        <div className="mt-6">
          <button
            onClick={onConnectClick}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Connect Your First Channel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Grid of channel cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {channels.map((channel) => (
          <div
            key={channel.channel_id}
            className="bg-white overflow-hidden shadow rounded-lg border hover:shadow-md transition-shadow duration-300"
          >
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  {platformIcons[channel.platform.toLowerCase()] || 
                    <div className="rounded-full bg-gray-400 p-3">
                      <span className="text-white font-bold">{channel.platform.charAt(0).toUpperCase()}</span>
                    </div>
                  }
                  <div className="ml-4">
                    <h3 className="text-lg font-medium text-gray-900 truncate max-w-[180px]">
                      {channel.name}
                    </h3>
                    <div className="flex items-center mt-1">
                      {channel.active ? (
                        <div className="flex items-center text-green-600">
                          <HiOutlineStatusOnline className="mr-1 h-4 w-4" />
                          <span className="text-xs">Active</span>
                        </div>
                      ) : (
                        <div className="flex items-center text-gray-500">
                          <HiOutlineStatusOffline className="mr-1 h-4 w-4" />
                          <span className="text-xs">Inactive</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                <Menu as="div" className="relative inline-block text-left">
                  {({ open }) => (
                    <>
                      <div>
                        <Menu.Button className="flex items-center text-gray-400 hover:text-gray-600 focus:outline-none">
                          <HiOutlineDotsVertical className="h-5 w-5" />
                        </Menu.Button>
                      </div>
                      
                      <Transition
                        show={open}
                        as={Fragment}
                        enter="transition ease-out duration-100"
                        enterFrom="transform opacity-0 scale-95"
                        enterTo="transform opacity-100 scale-100"
                        leave="transition ease-in duration-75"
                        leaveFrom="transform opacity-100 scale-100"
                        leaveTo="transform opacity-0 scale-95"
                      >
                        <Menu.Items className="absolute right-0 z-10 mt-2 w-56 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                          <div className="py-1">
                            <Menu.Item>
                              {({ active }) => (
                                <button
                                  className={`${
                                    active ? 'bg-gray-100 text-gray-900' : 'text-gray-700'
                                  } flex w-full px-4 py-2 text-sm`}
                                  onClick={() => onChannelSelect(channel)}
                                >
                                  <HiOutlineCog className="mr-3 h-5 w-5 text-gray-400" />
                                  Manage Channel
                                </button>
                              )}
                            </Menu.Item>
                            <Menu.Item>
                              {({ active }) => (
                                <button
                                  className={`${
                                    active ? 'bg-gray-100 text-gray-900' : 'text-gray-700'
                                  } flex w-full px-4 py-2 text-sm`}
                                  onClick={() => handleDeleteClick(channel.channel_id)}
                                >
                                  <HiOutlineTrash className="mr-3 h-5 w-5 text-red-400" />
                                  Delete Channel
                                </button>
                              )}
                            </Menu.Item>
                          </div>
                        </Menu.Items>
                      </Transition>
                    </>
                  )}
                </Menu>
              </div>
              
              {/* Channel stats - conversations, messages, etc. */}
              <div className="mt-6 grid grid-cols-2 gap-4">
                <div className="border rounded-md p-3 bg-gray-50">
                  <div className="text-xs text-gray-500">Platform</div>
                  <div className="text-sm font-medium capitalize">{channel.platform}</div>
                </div>
                <div className="border rounded-md p-3 bg-gray-50">
                  <div className="text-xs text-gray-500">Created</div>
                  <div className="text-sm font-medium">{new Date(channel.created_at).toLocaleDateString()}</div>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 px-4 py-3 sm:px-6">
              <button
                onClick={() => onChannelSelect(channel)}
                className="w-full text-sm font-medium text-indigo-600 hover:text-indigo-500 flex justify-center items-center"
              >
                View Details
                <svg className="ml-1 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Delete confirmation dialog */}
      {showDeleteConfirm && (
        <div className="fixed z-10 inset-0 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                    <HiOutlineTrash className="h-6 w-6 text-red-600" />
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">Delete Channel</h3>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500">
                        Are you sure you want to delete this channel? This action cannot be undone and all associated conversations will be lost.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button 
                  type="button" 
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm"
                  onClick={handleConfirmDelete}
                >
                  Delete
                </button>
                <button 
                  type="button" 
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  onClick={() => setShowDeleteConfirm(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChannelList;